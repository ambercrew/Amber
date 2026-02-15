use base64::{Engine as _, engine::general_purpose};
use prost::Message;

pub trait IntoBase64 {
    fn into_base64(self) -> String;
}

impl<T> IntoBase64 for T
where
    T: Message,
{
    fn into_base64(self) -> String {
        let mut buffer = Vec::new();
        self.encode(&mut buffer).unwrap();
        general_purpose::STANDARD.encode(buffer)
    }
}
