use std::sync::Arc;

use rig::tool::{Tool, ToolContext};
use schemars::schema_for;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use thiserror::Error;
use uuid::Uuid;

use crate::common::services::lexical_json_converter::{
    LexicalJsonConverter, LexicalJsonConverterError,
};
use crate::elements::dto::create_card_dto::CreateCardDto;
use crate::elements::dto::create_meta_dto::CreateMetaDto;
use crate::elements::services::element_creation_service::{
    ElementCreationError, ElementCreationService,
};
use crate::elements::value_objects::element_id::ElementId;
use crate::elements::value_objects::origin::Origin;

const MAX_NAME_LEN: usize = 60;
const CLOZE_HIDDEN_TAG: &str = "mark";
const CLOZE_HIDDEN_ATTRIBUTE: &str = "data-cloze-hidden";
const CLOZE_PLACEHOLDER: &str = "[...]";

#[derive(Deserialize, Debug, Clone, Serialize, schemars::JsonSchema)]
pub struct CreateFlashcardArgs {
    #[schemars(
        description = "The text shown on the front of the flashcard (the question or prompt), \
        formatted as Markdown. To hide part of it as a cloze blank until the user reveals it, \
        wrap that phrase in double curly braces, e.g. \"The capital of France is {{Paris}}.\""
    )]
    pub front: String,
    #[schemars(
        description = "The text shown on the back of the flashcard (the answer), formatted as \
        Markdown. Cloze markers are not applied here."
    )]
    pub back: String,
}

#[derive(Error, Debug)]
pub enum CreateFlashcardError {
    #[error("Failed to create the flashcard")]
    Creation(#[from] ElementCreationError),
    #[error("Failed to convert the flashcard content")]
    Conversion(#[from] LexicalJsonConverterError),
}

pub struct CreateFlashcard {
    element_creation_service: Arc<dyn ElementCreationService>,
    lexical_json_converter: Arc<dyn LexicalJsonConverter>,
    parent: Option<ElementId>,
}

impl CreateFlashcard {
    pub fn new(
        element_creation_service: Arc<dyn ElementCreationService>,
        lexical_json_converter: Arc<dyn LexicalJsonConverter>,
        parent: Option<ElementId>,
    ) -> Self {
        Self {
            element_creation_service,
            lexical_json_converter,
            parent,
        }
    }
}

// TODO: split into create flashcards and create cloze
impl Tool for CreateFlashcard {
    const NAME: &'static str = "create_flashcard";

    type Error = CreateFlashcardError;
    type Args = CreateFlashcardArgs;
    type Output = String;

    fn description(&self) -> String {
        "Creates a flashcard for the user to review later with spaced repetition, with a \
        front and a back. Use this when the user asks you to make a flashcard, or when \
        turning a fact or definition they're learning into a card would help them memorize \
        it."
        .to_string()
    }

    fn parameters(&self) -> Value {
        serde_json::to_value(schema_for!(CreateFlashcardArgs)).unwrap()
    }

    async fn call(
        &self,
        _context: &mut ToolContext,
        args: Self::Args,
    ) -> Result<Self::Output, Self::Error> {
        let front_markdown = insert_cloze_markers(&args.front);

        let (front, back) = tokio::try_join!(
            self.lexical_json_converter
                .convert_markdown(&front_markdown),
            self.lexical_json_converter.convert_markdown(&args.back),
        )?;

        let dto = CreateCardDto {
            id: Uuid::new_v4(),
            meta: CreateMetaDto {
                name: flashcard_name(&args.front),
                parent: self.parent,
                origin: Origin::Inherited,
            },
            front,
            back,
        };

        self.element_creation_service.create_card(dto).await?;

        Ok("Flashcard created.".to_string())
    }
}

/// Derives a short element name from the front text, stripping cloze markers
/// so the name reads naturally rather than showing literal `{{ }}` braces.
fn flashcard_name(front: &str) -> String {
    let plain = front.replace("{{", "").replace("}}", "");
    let trimmed = plain.trim();

    if trimmed.chars().count() > MAX_NAME_LEN {
        format!(
            "{}…",
            trimmed.chars().take(MAX_NAME_LEN).collect::<String>()
        )
    } else {
        trimmed.to_string()
    }
}

/// Replaces `{{hidden}}`-delimited spans in Markdown text with the raw
/// `<mark data-cloze-hidden="…">` HTML `ClozeHiddenNode.importDOM` parses
/// back into a cloze-hidden node — Markdown renderers pass through inline
/// HTML unchanged, so this survives the frontend's Markdown-to-Lexical
/// conversion. The rest of the text is left as-is, since it's Markdown the
/// frontend renderer should interpret, not literal text to escape. An
/// unterminated `{{` is kept as literal text rather than dropped.
fn insert_cloze_markers(text: &str) -> String {
    let mut markdown = String::new();

    for (i, part) in text.split("{{").enumerate() {
        if i == 0 {
            markdown.push_str(part);
            continue;
        }

        match part.split_once("}}") {
            Some((hidden, rest)) => {
                markdown.push_str(&format!(
                    "<{CLOZE_HIDDEN_TAG} {CLOZE_HIDDEN_ATTRIBUTE}=\"{}\">{CLOZE_PLACEHOLDER}</{CLOZE_HIDDEN_TAG}>",
                    escape_attribute(hidden)
                ));
                markdown.push_str(rest);
            }
            None => markdown.push_str(&format!("{{{{{part}")),
        }
    }

    markdown
}

/// Escapes text for safe use inside an HTML attribute value.
fn escape_attribute(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

#[cfg(test)]
mod tests {
    use async_trait::async_trait;
    use injector::{injector::Injector, register_scope};

    use crate::{
        bibliographical_sources::{
            entities::bibliographical_source::BibliographicalSource,
            repositories::bibliographical_source_repository::BibliographicalSourceRepository,
            value_objects::bibliographical_source_type::BibliographicalSourceType,
        },
        elements::{
            repositories::{
                card_repository::CardRepository, extract_repository::ExtractRepository,
                folder_repository::FolderRepository, meta_repository::MetaRepository,
                reading_repository::ReadingRepository,
            },
            services::implementations::{
                default_element_creation_service::DefaultElementCreationService,
                default_element_index_service::DefaultElementIndexService,
                default_priority_service::DefaultPriorityService,
            },
            services::{
                element_index_service::ElementIndexService, priority_service::PriorityService,
            },
        },
        infrastructure::repositories::sqlite::{
            sqlite_bibliographical_source_repository::SqliteBibliographicalSourceRepository,
            sqlite_card_repository::SqliteCardRepository,
            sqlite_card_review_repository::SqliteCardReviewRepository,
            sqlite_extract_repository::SqliteExtractRepository,
            sqlite_folder_repository::SqliteFolderRepository,
            sqlite_meta_repository::SqliteMetaRepository,
            sqlite_reading_repository::SqliteReadingRepository,
            sqlite_reading_review_repository::SqliteReadingReviewRepository,
            sqlite_study_profile_repository::SqliteStudyProfileRepository,
        },
        study::{
            repositories::{
                card_review_repository::CardReviewRepository,
                reading_review_repository::ReadingReviewRepository,
                study_profile_repository::StudyProfileRepository,
            },
            services::{
                implementations::default_profile_resolution_service::DefaultProfileResolutionService,
                profile_resolution_service::ProfileResolutionService,
            },
        },
        test_utils::create_test_injector,
    };

    use super::*;

    /// Echoes the Markdown back unchanged, standing in for the real
    /// frontend conversion so tests can assert on the Markdown this tool
    /// produces.
    struct EchoLexicalJsonConverter;

    #[async_trait]
    impl LexicalJsonConverter for EchoLexicalJsonConverter {
        async fn convert_markdown(
            &self,
            markdown: &str,
        ) -> Result<String, LexicalJsonConverterError> {
            Ok(markdown.to_string())
        }
    }

    async fn initialize_test_injector() -> Injector {
        let mut injector = create_test_injector().await;

        register_scope!(injector, dyn FolderRepository, SqliteFolderRepository);
        register_scope!(injector, dyn ReadingRepository, SqliteReadingRepository);
        register_scope!(injector, dyn ExtractRepository, SqliteExtractRepository);
        register_scope!(injector, dyn CardRepository, SqliteCardRepository);
        register_scope!(injector, dyn MetaRepository, SqliteMetaRepository);
        register_scope!(
            injector,
            dyn BibliographicalSourceRepository,
            SqliteBibliographicalSourceRepository
        );
        register_scope!(
            injector,
            dyn ElementIndexService,
            DefaultElementIndexService
        );
        register_scope!(injector, dyn PriorityService, DefaultPriorityService);
        register_scope!(
            injector,
            dyn ReadingReviewRepository,
            SqliteReadingReviewRepository
        );
        register_scope!(
            injector,
            dyn CardReviewRepository,
            SqliteCardReviewRepository
        );
        register_scope!(
            injector,
            dyn StudyProfileRepository,
            SqliteStudyProfileRepository
        );
        register_scope!(
            injector,
            dyn ProfileResolutionService,
            DefaultProfileResolutionService
        );
        register_scope!(
            injector,
            dyn ElementCreationService,
            DefaultElementCreationService
        );

        injector
    }

    #[tokio::test]
    async fn call_plain_front_and_back_created_card_with_markdown_content() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let element_creation_service = scope.resolve::<dyn ElementCreationService>().await;
        let card_repository = scope.resolve::<dyn CardRepository>().await;

        let tool = CreateFlashcard::new(
            element_creation_service,
            Arc::new(EchoLexicalJsonConverter),
            None,
        );

        // Act

        let actual = tool
            .call(
                &mut ToolContext::default(),
                CreateFlashcardArgs {
                    front: "What is the capital of France?".to_string(),
                    back: "Paris".to_string(),
                },
            )
            .await
            .unwrap();

        // Assert

        assert_eq!("Flashcard created.", actual);
        let cards = card_repository.get_all().await.unwrap();
        assert_eq!(1, cards.len());
        assert_eq!("What is the capital of France?", cards[0].meta.name);
        assert_eq!("What is the capital of France?", cards[0].front);
        assert_eq!("Paris", cards[0].back);
    }

    #[tokio::test]
    async fn call_front_with_cloze_marker_created_card_with_hidden_mark() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let element_creation_service = scope.resolve::<dyn ElementCreationService>().await;
        let card_repository = scope.resolve::<dyn CardRepository>().await;

        let tool = CreateFlashcard::new(
            element_creation_service,
            Arc::new(EchoLexicalJsonConverter),
            None,
        );

        // Act

        tool.call(
            &mut ToolContext::default(),
            CreateFlashcardArgs {
                front: "The capital of France is {{Paris}}.".to_string(),
                back: "Paris".to_string(),
            },
        )
        .await
        .unwrap();

        // Assert

        let cards = card_repository.get_all().await.unwrap();
        assert_eq!(1, cards.len());
        assert_eq!("The capital of France is Paris.", cards[0].meta.name);
        assert_eq!(
            "The capital of France is <mark data-cloze-hidden=\"Paris\">[...]</mark>.",
            cards[0].front
        );
    }

    #[tokio::test]
    async fn call_inherited_origin_copies_parent_lineage_and_bibliographical_source() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let element_creation_service = scope.resolve::<dyn ElementCreationService>().await;
        let folder_repository = scope.resolve::<dyn FolderRepository>().await;
        let card_repository = scope.resolve::<dyn CardRepository>().await;
        let bibliographical_source_repository =
            scope.resolve::<dyn BibliographicalSourceRepository>().await;

        let bibliographical_source_id = Uuid::new_v4();
        let now = chrono::Utc::now();
        bibliographical_source_repository
            .create(&BibliographicalSource {
                id: bibliographical_source_id,
                title: "Test source".to_string(),
                authors: None,
                publication_date: None,
                source_type: BibliographicalSourceType::File,
                location: None,
                created_at: now,
                modified_at: now,
            })
            .await
            .unwrap();
        element_creation_service
            .create_folder(crate::elements::dto::create_folder_dto::CreateFolderDto {
                meta: CreateMetaDto {
                    name: "Parent folder".to_string(),
                    parent: None,
                    origin: Origin::Custom {
                        derived_from: None,
                        bibliographical_source_id: Some(bibliographical_source_id),
                    },
                },
            })
            .await
            .unwrap();
        let parent = folder_repository.get_all().await.unwrap().remove(0);
        let parent_id = parent.meta.element_id;

        let tool = CreateFlashcard::new(
            element_creation_service,
            Arc::new(EchoLexicalJsonConverter),
            Some(parent_id),
        );

        // Act

        tool.call(
            &mut ToolContext::default(),
            CreateFlashcardArgs {
                front: "What is the capital of France?".to_string(),
                back: "Paris".to_string(),
            },
        )
        .await
        .unwrap();

        // Assert

        let cards = card_repository.get_all().await.unwrap();
        assert_eq!(1, cards.len());
        assert_eq!(Some(parent_id), cards[0].meta.derived_from);
        assert_eq!(
            Some(bibliographical_source_id),
            cards[0].meta.bibliographical_source_id
        );
    }

    #[test]
    fn insert_cloze_markers_unterminated_marker_kept_as_literal_text() {
        // Arrange

        let text = "Hello {{world";

        // Act

        let actual = insert_cloze_markers(text);

        // Assert

        assert_eq!("Hello {{world", actual);
    }

    #[test]
    fn insert_cloze_markers_hidden_text_special_characters_are_escaped() {
        // Arrange

        let text = "The answer is {{A & B <tag> \"quoted\"}}.";

        // Act

        let actual = insert_cloze_markers(text);

        // Assert

        assert_eq!(
            "The answer is <mark data-cloze-hidden=\"A &amp; B &lt;tag&gt; &quot;quoted&quot;\">[...]</mark>.",
            actual
        );
    }
}
