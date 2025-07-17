use std::collections::HashMap;

use chrono::{Datelike, NaiveTime, Utc, naive::NaiveDate};
use sea_orm::{
    DbConn,
    entity::*,
    prelude::*,
    query::*,
    sea_query::{Alias, Expr, Func, IntoColumnRef},
};

use crate::{
    dto::home_statistics::HomeStatistics,
    entity::{
        repetition,
        review::{self, Rating},
    },
    util::database_util::DateTimeToDate,
};

pub async fn get_home_statistics(db_conn: &DbConn) -> Result<HomeStatistics, String> {
    let start_of_today = Utc::now()
        .with_time(NaiveTime::from_hms_opt(0, 0, 0).unwrap())
        .unwrap();

    let end_of_today = Utc::now()
        .with_time(NaiveTime::from_hms_opt(23, 59, 59).unwrap())
        .unwrap();

    let filter =
        review::Entity::find().filter(review::Column::Date.between(start_of_today, end_of_today));

    let number_of_reviews = match filter.clone().count(db_conn).await {
        Err(err) => return Err(err.to_string()),
        Ok(number_of_reviews) => number_of_reviews,
    };

    let total_time = match filter
        .select_only()
        .column_as(review::Column::StudyTime.sum(), "sum")
        .into_tuple::<Option<i32>>()
        .one(db_conn)
        .await
    {
        Err(err) => return Err(err.to_string()),
        Ok(total_time) => total_time.unwrap_or(Some(0)).unwrap_or(0),
    };

    Ok(HomeStatistics {
        number_of_reviews,
        total_time,
        review_counts: group_by_date_and_filter_this_year_and_get_counts(
            db_conn,
            review::Entity::find(),
            review::Column::Date,
            review::Column::Id,
        )
        .await?,
        due_counts: group_by_date_and_filter_this_year_and_get_counts(
            db_conn,
            repetition::Entity::find(),
            repetition::Column::Due,
            repetition::Column::Id,
        )
        .await?,
    })
}

async fn group_by_date_and_filter_this_year_and_get_counts<E>(
    db_conn: &DbConn,
    select: Select<E>,
    date_column: impl IntoColumnRef + ColumnTrait,
    id_column: impl IntoColumnRef + ColumnTrait,
) -> Result<HashMap<NaiveDate, i32>, String>
where
    E: EntityTrait,
{
    let start_of_year = Utc::now()
        .with_month(1)
        .unwrap()
        .with_day(1)
        .unwrap()
        .with_time(NaiveTime::from_hms_opt(0, 0, 0).unwrap())
        .unwrap();
    let end_of_year = Utc::now()
        .with_month(12)
        .unwrap()
        .with_day(31)
        .unwrap()
        .with_time(NaiveTime::from_hms_opt(11, 59, 59).unwrap())
        .unwrap();

    let result = select
        .filter(date_column.between(start_of_year, end_of_year))
        .select_only()
        .expr_as(
            Func::cust(DateTimeToDate).arg(Expr::col(date_column)),
            "only_date",
        )
        .expr(id_column.count())
        .group_by(Expr::col(Alias::new("only_date")))
        .into_tuple::<(NaiveDate, i32)>()
        .all(db_conn)
        .await;

    if let Err(err) = result {
        return Err(err.to_string());
    }

    let mut hash_map = HashMap::with_capacity(365);
    for (date, count) in result.unwrap() {
        hash_map.insert(date, count);
    }

    Ok(hash_map)
}

pub async fn register_review(
    db_conn: &DbConn,
    new_repetition: repetition::Model,
    rating: Rating,
    study_time: i32,
) -> Result<(), String> {
    let repetition_active_entity = repetition::ActiveModel {
        id: Set(new_repetition.id),
        file_id: Set(new_repetition.file_id),
        cell_id: Set(new_repetition.cell_id),
        due: Set(new_repetition.due),
        stability: Set(new_repetition.stability),
        difficulty: Set(new_repetition.difficulty),
        elapsed_days: Set(new_repetition.elapsed_days),
        scheduled_days: Set(new_repetition.scheduled_days),
        reps: Set(new_repetition.reps),
        lapses: Set(new_repetition.lapses),
        state: Set(new_repetition.state),
        last_review: Set(new_repetition.last_review),
        additional_content: Set(new_repetition.additional_content),
    };
    let txn = match db_conn.begin().await {
        Ok(txn) => txn,
        Err(err) => return Err(err.to_string()),
    };

    if let Err(err) = repetition_active_entity.update(&txn).await {
        return Err(err.to_string());
    }

    let review_active_entity = review::ActiveModel {
        cell_id: Set(Some(new_repetition.cell_id)),
        date: Set(Utc::now().to_utc()),
        rating: Set(rating),
        study_time: Set(study_time),
        ..Default::default()
    };
    if let Err(err) = review_active_entity.insert(&txn).await {
        return Err(err.to_string());
    }

    let result = txn.commit().await;
    match result {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use chrono::Duration;

    use crate::{
        entity::repetition::State,
        service::tests::{create_file_cell, get_db, insert_repetitions},
    };

    use super::*;

    #[tokio::test]
    async fn get_home_statistics_no_reviews_returned_zero() {
        // Arrange

        let db_conn = get_db().await;

        // Act

        let actual = get_home_statistics(&db_conn).await.unwrap();

        // Assert

        assert_eq!(0, actual.number_of_reviews);
        assert_eq!(0, actual.total_time);
    }

    #[tokio::test]
    async fn get_home_statistics_with_reviews_returned_correct_statistics() {
        // Arrange

        let db_conn = get_db().await;
        let (file_id, cell_id) = create_file_cell(&db_conn, "file 1").await;
        insert_repetitions(
            &db_conn,
            vec![repetition::ActiveModel {
                file_id: Set(file_id),
                cell_id: Set(cell_id),
                ..Default::default()
            }],
        )
        .await
        .unwrap();
        let repetition_id = repetition::Entity::find()
            .one(&db_conn)
            .await
            .unwrap()
            .unwrap()
            .id;
        let repetition = repetition::Model {
            id: repetition_id,
            file_id,
            cell_id,
            due: Utc::now().to_utc(),
            last_review: Utc::now().to_utc(),
            ..Default::default()
        };
        register_review(&db_conn, repetition.clone(), Rating::Good, 15)
            .await
            .unwrap();
        register_review(&db_conn, repetition.clone(), Rating::Again, 10)
            .await
            .unwrap();
        let review = review::ActiveModel {
            cell_id: Set(Some(cell_id)),
            study_time: Set(12),
            date: Set(Utc::now().to_utc() - Duration::days(1)),
            rating: Set(Rating::Again),
            ..Default::default()
        };
        review.insert(&db_conn).await.unwrap();

        // Act

        let actual = get_home_statistics(&db_conn).await.unwrap();

        // Assert

        assert_eq!(2, actual.number_of_reviews);
        assert_eq!(25, actual.total_time);
    }

    #[tokio::test]
    async fn register_review_valid_input_registered_review_and_update_repetition() {
        // Arrange

        let db_conn = get_db().await;
        let (file_id, cell_id) = create_file_cell(&db_conn, "file 1").await;
        insert_repetitions(
            &db_conn,
            vec![repetition::ActiveModel {
                file_id: Set(file_id),
                cell_id: Set(cell_id),
                ..Default::default()
            }],
        )
        .await
        .unwrap();
        let repetition_id = repetition::Entity::find()
            .one(&db_conn)
            .await
            .unwrap()
            .unwrap()
            .id;
        let date = Utc::now().to_utc();
        let repetition = repetition::Model {
            id: repetition_id,
            file_id,
            cell_id,
            due: date,
            reps: 1,
            stability: 2.1f32,
            difficulty: 4.2f32,
            elapsed_days: 5,
            scheduled_days: 6,
            lapses: 7,
            state: State::New,
            last_review: date,
            additional_content: Some("".into()),
        };

        // Act

        register_review(&db_conn, repetition.clone(), Rating::Again, 10)
            .await
            .unwrap();

        // Assert

        let actual_repetition = repetition::Entity::find()
            .one(&db_conn)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(actual_repetition.id, repetition.id);
        assert_eq!(actual_repetition.file_id, repetition.file_id);
        assert_eq!(actual_repetition.cell_id, repetition.cell_id);
        assert_eq!(actual_repetition.due, repetition.due);
        assert_eq!(actual_repetition.reps, repetition.reps);
        assert_eq!(actual_repetition.stability, repetition.stability);
        assert_eq!(actual_repetition.difficulty, repetition.difficulty);
        assert_eq!(actual_repetition.elapsed_days, repetition.elapsed_days);
        assert_eq!(actual_repetition.scheduled_days, repetition.scheduled_days);
        assert_eq!(actual_repetition.lapses, repetition.lapses);
        assert_eq!(actual_repetition.state, repetition.state);
        assert_eq!(actual_repetition.last_review, repetition.last_review);

        let actual_review = review::Entity::find().one(&db_conn).await.unwrap().unwrap();
        assert_eq!(actual_review.cell_id, Some(repetition.cell_id));
        assert!((actual_review.date - Utc::now().to_utc()).num_minutes() < 1);
        assert_eq!(actual_review.rating, Rating::Again);
        assert_eq!(actual_review.study_time, 10);
    }
}
