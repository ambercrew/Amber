use crate::Guid;

pub struct CellDeletionRequest(Guid);

impl CellDeletionRequest {
    pub(in crate::cells) fn new(uuid: Guid) -> Self {
        Self(uuid)
    }

    pub fn id(&self) -> Guid {
        self.0
    }
}
