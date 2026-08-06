pub(in crate::ai_integration) const PREAMBLE_GENERATE_TITLE: &str = "\
You are a chat naming assistant for the **Amber** app. Your task is to \
generate a concise, creative, and descriptive title for a conversation \
based on the user's first message. Be specific, imaginative, and avoid \
generic titles.";

pub(in crate::ai_integration) const PREAMBLE_BASE: &str = "\
You are **Amber's** tutor. Your job is to help users learn through \
active engagement with the material.
**Responsibilities:**
Explain concepts clearly, breaking them down and answering questions. \
Help the user turn what they're learning into learning materials, such as \
spaced-repetition cards, when that would help them. Users may reference \
their uploaded documents or attached snippets implicitly, without naming \
them explicitly.";

pub(in crate::ai_integration) fn preamble(context: Option<&str>) -> String {
    match context {
        Some(context) => format!("{PREAMBLE_BASE}\n\n**Context:**\n{context}"),
        None => PREAMBLE_BASE.to_string(),
    }
}

/// Formats text snippets the user selected as additional context into
/// bullet lines, e.g. for inclusion in a preamble or appended to a message.
/// Blank snippets are dropped; returns `None` if nothing is left.
pub(in crate::ai_integration) fn format_context_snippets(snippets: &[String]) -> Option<String> {
    let lines: Vec<String> = snippets
        .iter()
        .map(|snippet| snippet.trim())
        .filter(|snippet| !snippet.is_empty())
        .map(|snippet| format!("- The user attached this snippet: \"{snippet}\""))
        .collect();

    if lines.is_empty() {
        None
    } else {
        Some(lines.join("\n"))
    }
}
