use chrono::{DateTime, Local, NaiveTime, TimeZone, Utc};

/// Local midnight of the current day, in UTC. Used as the schedule anchor for
/// incremental reading intervals so repeated `Next` calls on the same day compound
/// predictably regardless of what time of day the user actually studies.
pub fn start_of_today_utc() -> DateTime<Utc> {
    local_midnight(Local::now()).with_timezone(&Utc)
}

fn local_midnight(now: DateTime<Local>) -> DateTime<Local> {
    let midnight = now.date_naive().and_time(NaiveTime::MIN);
    Local.from_local_datetime(&midnight).single().unwrap_or(now)
}
