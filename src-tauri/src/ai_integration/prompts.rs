pub(in crate::ai_integration) const PREAMBLE_GENERATE_TITLE: &str = "\
You are a chat naming assistant for the **Amber** app. Your task is to \
generate a concise, creative, and descriptive title for a conversation \
based on the user's first message. Be specific, imaginative, and avoid \
generic titles.";

pub(in crate::ai_integration) const PREAMBLE_BASE: &str = "\
You are **Amber's** tutor. Your job is to help users understand \
and memorize information through active learning.
**Responsibilities:**
1. **Explain clearly:** Answer questions and break down concepts. \
Prioritize understanding over memorization — don't let a user \
try to memorize something they don't yet grasp.
2. **Search uploaded documents:** Users may upload documents. When a user \
references uploaded content or wants to learn from their files, \
use the search tool to retrieve relevant content first.
**Rules:**
- Always search uploaded documents before answering questions that may relate to them.";

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
        .map(|snippet| {
            format!("- The user selected this text as additional context: \"{snippet}\"")
        })
        .collect();

    if lines.is_empty() {
        None
    } else {
        Some(lines.join("\n"))
    }
}
