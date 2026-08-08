use crate::local_configurations::entities::local_configuration::LocalConfiguration;

pub struct LocalConfigurationRow {
    pub name: String,
    pub value: String,
}

impl From<LocalConfigurationRow> for LocalConfiguration {
    fn from(value: LocalConfigurationRow) -> Self {
        LocalConfiguration {
            name: value.name,
            value: value.value,
        }
    }
}
