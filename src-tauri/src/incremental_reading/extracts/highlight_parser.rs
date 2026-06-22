use std::collections::HashMap;

use scraper::{Html, Selector};

/// The same highlight id might be split across multiple HTML fragments
/// (e.g. when the user selects text that spans separate blocks). This
/// accumulates all fragments sharing the same id into a single string.
pub fn parse_highlights(html: &str) -> HashMap<String, String> {
    let document = Html::parse_fragment(html);
    let selector = Selector::parse("highlight").expect("Invalid selector");

    let mut highlights: HashMap<String, String> = HashMap::new();
    for el in document.select(&selector) {
        let Some(id) = el.attr("highlight-id") else {
            continue;
        };
        highlights
            .entry(id.to_string())
            .or_default()
            .push_str(&format!("<p>{}</p>", &el.inner_html()));
    }
    highlights
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_highlights_single_id_returns_inner_html() {
        // Arrange

        let html = r#"<highlight highlight-id="abc">some text</highlight>"#;

        // Act

        let actual = parse_highlights(html);

        // Assert

        assert_eq!(1, actual.len());
        assert_eq!("<p>some text</p>", actual["abc"]);
    }

    #[test]
    fn parse_highlights_id_split_across_multiple_tags_accumulates_inner_html() {
        // Arrange

        let html = r#"<highlight highlight-id="abc">first part</highlight> in between <highlight highlight-id="abc">second part</highlight>"#;

        // Act

        let actual = parse_highlights(html);

        // Assert

        assert_eq!(1, actual.len());
        assert_eq!("<p>first part</p><p>second part</p>", actual["abc"]);
    }
}
