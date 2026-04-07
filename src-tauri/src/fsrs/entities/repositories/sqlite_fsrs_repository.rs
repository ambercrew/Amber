use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use injector_derive::ScopeInjectable;

use crate::{
    Guid,
    common::repository_error::RepositoryError,
    fsrs::entities::{
        fsrs_profile::FsrsProfile,
        repositories::{
            sqlite_fsrs_repository::fsrs_profile_row::FsrsProfileRow,
            traits::fsrs_repository::{DeleteFsrsRequest, FsrsRepository},
        },
    },
    infrastructure::primitives::db_transaction::DbTransaction,
};

#[derive(ScopeInjectable)]
pub struct SqliteFsrsRepository {
    tx: Arc<DbTransaction>,
}

#[async_trait]
impl FsrsRepository for SqliteFsrsRepository {
    async fn get_by_id(&self, id: Guid) -> Result<FsrsProfile, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let row = sqlx::query_as!(
            FsrsProfileRow,
            r#"SELECT
                id as "id: _",
                created_date as "created_date: _",
                modified_date as "modified_date: _",
                name,
                request_retention as "request_retention: _",
                maximum_interval as "maximum_interval: _",
                weights
            FROM fsrs_profiles
            WHERE id = $1"#,
            id
        )
        .fetch_one(&mut *tx)
        .await;

        match row {
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
            Ok(row) => Ok(row.into()),
        }
    }

    async fn get_all_fsrs_profiles(&self) -> Result<Vec<FsrsProfile>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            FsrsProfileRow,
            r#"SELECT
                id as "id: _",
                created_date as "created_date: _",
                modified_date as "modified_date: _",
                name,
                request_retention as "request_retention: _",
                maximum_interval as "maximum_interval: _",
                weights
            FROM fsrs_profiles"#,
        )
        .fetch_all(&mut *tx)
        .await;

        match rows {
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
            Ok(rows) => Ok(rows.into_iter().map(|row| row.into()).collect()),
        }
    }

    async fn create(&self, fsrs_profile: &FsrsProfile) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let id = fsrs_profile.id();
        let created_date = fsrs_profile.created_date();
        let modified_date = fsrs_profile.modified_date();
        let name = fsrs_profile.name();
        let request_retention = fsrs_profile.request_retention();
        let maximum_interval = fsrs_profile.maximum_interval();
        let weights = fsrs_profile
            .weights()
            .iter()
            .map(|val| val.to_string())
            .collect::<Vec<_>>()
            .join(" ");

        let result = sqlx::query!(
            "INSERT INTO fsrs_profiles(
                id,
                created_date,
                modified_date,
                name,
                request_retention,
                maximum_interval,
                weights)
            VALUES ($1, datetime($2), datetime($3), $4, $5, $6, $7)",
            id,
            created_date,
            modified_date,
            name,
            request_retention,
            maximum_interval,
            weights
        )
        .execute(&mut *tx)
        .await;

        match result {
            Ok(_) => Ok(()),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
    }

    async fn update(&self, fsrs_profile: &FsrsProfile) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let id = fsrs_profile.id();
        let created_date = fsrs_profile.created_date();
        let modified_date = fsrs_profile.modified_date();
        let name = fsrs_profile.name();
        let request_retention = fsrs_profile.request_retention();
        let maximum_interval = fsrs_profile.maximum_interval();
        let weights = fsrs_profile
            .weights()
            .iter()
            .map(|val| val.to_string())
            .collect::<Vec<_>>()
            .join(" ");

        let result = sqlx::query!(
            "UPDATE fsrs_profiles SET
                id = $1,
                created_date = datetime($2),
                modified_date = datetime($3),
                name = $4,
                request_retention = $5,
                maximum_interval = $6,
                weights = $7
            WHERE id = $1",
            id,
            created_date,
            modified_date,
            name,
            request_retention,
            maximum_interval,
            weights
        )
        .execute(&mut *tx)
        .await;

        match result {
            Ok(_) => Ok(()),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
    }

    async fn delete_by_id(&self, request: DeleteFsrsRequest) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let id = request.id();
        let result = sqlx::query!("DELETE FROM fsrs_profiles WHERE id = $1", id)
            .execute(&mut *tx)
            .await;

        match result {
            Ok(_) => Ok(()),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
    }

    async fn upsert_with_modified_date_if_modified_before(
        &self,
        fsrs_profile: &FsrsProfile,
        modified_date: DateTime<Utc>,
    ) -> Result<u64, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let id = fsrs_profile.id();
        let created_date = fsrs_profile.created_date();
        let name = fsrs_profile.name();
        let request_retention = fsrs_profile.request_retention();
        let maximum_interval = fsrs_profile.maximum_interval();
        let weights = fsrs_profile
            .weights()
            .iter()
            .map(|val| val.to_string())
            .collect::<Vec<_>>()
            .join(" ");

        let result = sqlx::query!(
            r#"INSERT INTO fsrs_profiles(
                id,
                created_date,
                modified_date,
                name,
                request_retention,
                maximum_interval,
                weights)
            VALUES ($1, datetime($2), datetime($3), $4, $5, $6, $7)
            ON CONFLICT(id) DO UPDATE
            SET id = $1,
                created_date = datetime($2),
                modified_date = datetime($3),
                name = $4,
                request_retention = $5,
                maximum_interval = $6,
                weights = $7
            WHERE modified_date <= datetime($3)
            "#,
            id,
            created_date,
            modified_date,
            name,
            request_retention,
            maximum_interval,
            weights
        )
        .execute(&mut *tx)
        .await;

        match result {
            Ok(result) => Ok(result.rows_affected()),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
    }

    async fn get_all_modified_on_or_after(
        &self,
        modified_date: DateTime<Utc>,
    ) -> Result<Vec<FsrsProfile>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            FsrsProfileRow,
            r#"SELECT
                id as "id: _",
                created_date as "created_date: _",
                modified_date as "modified_date: _",
                name,
                request_retention as "request_retention: _",
                maximum_interval as "maximum_interval: _",
                weights
            FROM fsrs_profiles
            WHERE modified_date >= datetime($1)"#,
            modified_date
        )
        .fetch_all(&mut *tx)
        .await;

        match rows {
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
            Ok(rows) => Ok(rows.into_iter().map(|row| row.into()).collect()),
        }
    }
}

mod fsrs_profile_row {
    use chrono::{DateTime, Utc};

    use crate::Guid;

    use super::*;

    pub(super) struct FsrsProfileRow {
        pub id: Guid,
        pub created_date: DateTime<Utc>,
        pub modified_date: DateTime<Utc>,
        pub name: String,
        pub request_retention: f64,
        pub maximum_interval: f64,
        pub weights: String,
    }

    impl From<FsrsProfileRow> for FsrsProfile {
        fn from(value: FsrsProfileRow) -> Self {
            let weights = value
                .weights
                .split(' ')
                .map(|v| v.parse().unwrap())
                .collect();
            FsrsProfile::new_unchecked(
                value.id,
                value.created_date,
                value.modified_date,
                value.name,
                value.request_retention,
                value.maximum_interval,
                weights,
            )
        }
    }
}

#[cfg(test)]
pub mod tests {
    use chrono::Utc;
    use injector::{injector::Injector, register_scope};

    use crate::{DEFAULT_FSRS_PROFILE_ID, test_utils::create_test_injector};

    use super::*;

    async fn get_test_dependencies() -> Injector {
        let mut injector = create_test_injector().await;
        register_scope!(injector, dyn FsrsRepository, SqliteFsrsRepository);
        injector
    }

    #[tokio::test]
    pub async fn get_by_id_valid_input_returned_profile() {
        // Arrange

        let injector = get_test_dependencies().await;
        let scope = injector.start_scope();
        let fsrs_repository = scope.resolve::<dyn FsrsRepository>().await;

        let profile = FsrsProfile::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            "test".into(),
            1f64,
            1f64,
            vec![1f64],
        );
        fsrs_repository.create(&profile).await.unwrap();

        // Act

        let actual = fsrs_repository.get_by_id(profile.id()).await.unwrap();

        // Assert

        assert_eq!("test".to_string(), actual.name());
        assert_eq!(1f64, actual.request_retention());
    }

    #[tokio::test]
    pub async fn get_all_fsrs_profiles_valid_input_returned_all_profiles() {
        // Arrange

        let injector = get_test_dependencies().await;
        let scope = injector.start_scope();
        let fsrs_repository = scope.resolve::<dyn FsrsRepository>().await;

        let profile1 = FsrsProfile::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            "test".into(),
            1f64,
            1f64,
            vec![1f64],
        );
        fsrs_repository.create(&profile1).await.unwrap();

        let profile2 = FsrsProfile::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            "test".into(),
            1f64,
            1f64,
            vec![1f64],
        );
        fsrs_repository.create(&profile2).await.unwrap();

        // Act

        let actual = fsrs_repository.get_all_fsrs_profiles().await.unwrap();

        // Assert

        assert_eq!(3, actual.len());
        assert!(actual.iter().any(|item| item.id() == profile1.id()));
        assert!(actual.iter().any(|item| item.id() == profile2.id()));
        // Default profile, always created.
        assert!(
            actual
                .iter()
                .any(|item| item.id() == DEFAULT_FSRS_PROFILE_ID)
        );
    }

    #[tokio::test]
    pub async fn update_valid_input_updated_profile() {
        // Arrange

        let injector = get_test_dependencies().await;
        let scope = injector.start_scope();
        let fsrs_repository = scope.resolve::<dyn FsrsRepository>().await;

        let profile = FsrsProfile::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            "test".into(),
            1f64,
            1f64,
            vec![1f64],
        );
        fsrs_repository.create(&profile).await.unwrap();

        let updated_profile = FsrsProfile::new_unchecked(
            profile.id(),
            Utc::now(),
            Utc::now(),
            "new name".into(),
            2f64,
            2f64,
            vec![1f64],
        );

        // Act

        fsrs_repository.update(&updated_profile).await.unwrap();

        // Assert

        let actual = fsrs_repository.get_by_id(profile.id()).await.unwrap();
        assert_eq!("new name".to_string(), actual.name());
        assert_eq!(2f64, actual.request_retention());
    }
}
