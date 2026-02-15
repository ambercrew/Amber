use rig::{completion::ToolDefinition, tool::Tool};
use schemars::schema_for;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Deserialize, Serialize, schemars::JsonSchema)]
pub struct CreateFlashcardArgs {
    #[schemars(description = "The question of the flashcard.")]
    question: String,
    #[schemars(description = "The answer of the flash card")]
    answer: String,
}

#[derive(Error, Debug, PartialEq, Eq)]
pub enum CreateFlashCardError {}

pub struct CreateFlashCard;

impl Tool for CreateFlashCard {
    const NAME: &'static str = "create_flash_card";

    type Error = CreateFlashCardError;
    type Args = CreateFlashcardArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        let parameters = serde_json::to_value(schema_for!(CreateFlashcardArgs)).unwrap();

        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Create a flashcard for the user".to_string(),
            parameters,
        }
    }

    async fn call(&self, args: Self::Args) -> Result<Self::Output, Self::Error> {
        log::info!(
            "Inside tool!!!\nQuestion: {}\nAnswer: {}",
            args.question,
            args.answer
        );
        Ok("Flash card created successfully!".to_string())
    }
}
