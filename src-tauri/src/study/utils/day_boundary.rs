use chrono::{DateTime, Duration, Local, NaiveTime, TimeZone, Utc};

/// Local midnight of the current day, in UTC. Used as the schedule anchor for
/// incremental reading intervals so repeated `Next` calls on the same day compound
/// predictably regardless of what time of day the user actually studies.
pub fn start_of_today_utc() -> DateTime<Utc> {
    local_midnight(Local::now()).with_timezone(&Utc)
}

/// The last instant of the current local day. An element is "due" if its due date
/// falls on or before this instant — e.g. a card graded at 23:50 and scheduled for
/// "1 day" becomes due tomorrow, not in exactly 24 hours.
pub fn end_of_today_utc() -> DateTime<Utc> {
    start_of_today_utc() + Duration::days(1) - Duration::seconds(1)
}

fn local_midnight(now: DateTime<Local>) -> DateTime<Local> {
    let midnight = now.date_naive().and_time(NaiveTime::MIN);
    Local.from_local_datetime(&midnight).single().unwrap_or(now)
}
