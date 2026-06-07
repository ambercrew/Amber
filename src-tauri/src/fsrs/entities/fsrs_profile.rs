use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{DEFAULT_FSRS_PROFILE_ID, Guid};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FsrsProfile {
    id: Guid,
    created_date: DateTime<Utc>,
    modified_date: DateTime<Utc>,
    name: String,
    request_retention: f64,
    maximum_interval: f64,
    weights: Vec<f64>,
}

#[derive(Error, Debug, PartialEq, Eq)]
pub enum FsrsProfileError {
    #[error("Name cannot be empty!")]
    EmptyName,
    #[error("Incorrect number of weights!")]
    IncorrectNumberOfWeights,
}

impl FsrsProfile {
    pub fn new(
        id: Option<Guid>,
        name: String,
        request_retention: f64,
        maximum_interval: f64,
        weights: Vec<f64>,
    ) -> Result<Self, FsrsProfileError> {
        if name.is_empty() {
            return Err(FsrsProfileError::EmptyName);
        }
        if weights.len() != 21 {
            return Err(FsrsProfileError::IncorrectNumberOfWeights);
        }

        Ok(Self {
            id: id.unwrap_or(Guid::new_v4()),
            created_date: Utc::now(),
            modified_date: Utc::now(),
            name,
            request_retention,
            maximum_interval,
            weights,
        })
    }

    pub fn new_unchecked(
        id: Guid,
        created_date: DateTime<Utc>,
        modified_date: DateTime<Utc>,
        name: String,
        request_retention: f64,
        maximum_interval: f64,
        weights: Vec<f64>,
    ) -> Self {
        Self {
            id,
            created_date,
            modified_date,
            name,
            request_retention,
            maximum_interval,
            weights,
        }
    }

    pub fn id(&self) -> Guid {
        self.id
    }

    pub fn created_date(&self) -> DateTime<Utc> {
        self.created_date
    }

    pub fn modified_date(&self) -> DateTime<Utc> {
        self.modified_date
    }

    pub fn name(&self) -> &str {
        &self.name
    }

    pub fn request_retention(&self) -> f64 {
        self.request_retention
    }

    pub fn maximum_interval(&self) -> f64 {
        self.maximum_interval
    }

    pub fn weights(&self) -> &[f64] {
        &self.weights
    }

    pub fn set_name(&mut self, name: String) {
        self.name = name;
    }

    pub fn set_request_retention(&mut self, request_retention: f64) {
        self.request_retention = request_retention;
    }

    pub fn set_maximum_interval(&mut self, maximum_interval: f64) {
        self.maximum_interval = maximum_interval;
    }

    pub fn set_weights(&mut self, weights: Vec<f64>) {
        self.weights = weights;
    }
}

impl Default for FsrsProfile {
    fn default() -> Self {
        Self::new(
            Some(DEFAULT_FSRS_PROFILE_ID),
            "Default".to_string(),
            0.9,
            36500.0,
            vec![
                0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666,
                0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658,
                0.1542,
            ],
        )
        .unwrap()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_created_profile_with_correct_values() {
        // Act

        let actual = FsrsProfile::default();

        // Assert

        assert_eq!(DEFAULT_FSRS_PROFILE_ID, actual.id());
        assert_eq!("Default", actual.name());
        assert_eq!(0.9, actual.request_retention());
        assert_eq!(36500.0, actual.maximum_interval());
        assert_eq!(21, actual.weights().len());
    }
}
