# -*- coding: utf-8 -*-
"""
Social Media Post Generator Engine using local llama3.2 via Ollama & multi-stage AI reasoning.
Supports customizable parameters: subject, tone, key_message, target_audience, length, emojis, platform, and reference context.
"""

import os
import re
import html
from typing import Dict, Any
from openai import OpenAI

# Ollama exposes an OpenAI-compatible API on localhost
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")

# Initialize OpenAI client pointing at local Ollama
client = OpenAI(
    base_url=OLLAMA_BASE_URL,
    api_key="ollama"  # Ollama doesn't require a real API key
)

# Platform specifications and constraints
PLATFORM_SPECS = {
    "linkedin": {
        "name": "LinkedIn",
        "char_limit": 3000,
        "style_guide": "Professional, insightful, thought leadership, clear paragraph spacing, 3-5 relevant hashtags."
    },
    "twitter": {
        "name": "Twitter / X",
        "char_limit": 280,
        "style_guide": "Punchy, concise, high impact hook, 1-3 targeted hashtags."
    },
    "instagram": {
        "name": "Instagram",
        "char_limit": 2200,
        "style_guide": "Engaging visual caption, storytelling, emojis, relevant hashtags at bottom."
    },
    "facebook": {
        "name": "Facebook",
        "char_limit": 5000,
        "style_guide": "Conversational, community-focused, storytelling, engaging discussion starter."
    }
}

# Emoji density descriptions.
# The web UI sends a binary toggle: 'engaging' (on) or 'none' (off).
# The 'minimal' and 'expressive' keys are kept for any direct API callers.
EMOJI_DESCRIPTIONS = {
    "none": "Do NOT use any emojis whatsoever. Plain text only.",
    "minimal": "Use at most 1-2 subtle emojis, placed sparingly.",
    "engaging": "Use 3-6 well-chosen emojis to boost readability and engagement.",
    "expressive": "Use emojis liberally throughout for maximum energy and personality."
}

# Length preset descriptions
LENGTH_DESCRIPTIONS = {
    "short": "Short & punchy (around 50-80 words)",
    "medium": "Standard length (around 100-180 words)",
    "long": "In-depth detailed post (around 200-350 words)"
}

START_META_PATTERNS = [
    r"^(?:here(?:\s+is|\'s)|below\s+is|certainly|sure)[^:\n]*(?:post|caption|draft|version|rewrite|copy|text|submission|content)[:\s]*$",
    r"^(?:here(?:\s+is|\'s)|certainly|sure)[!,.\s]*$",
    r"^[\*#_\[\]\s]*(?:final|refined|polished|revised|optimized|draft|new)?\s*(?:linkedin|twitter|x|instagram|facebook|threads|social\s*media)?\s*(?:post|caption|draft|content|update)[\*#_\[\]:\s]*$",
    r"^(?:subject|topic|title|headline|hook|platform|tone|target\s*audience|audience|length|word\s*count)[:\s]+.*$",
    r"^(?:stage\s*\d|chain\s*of\s*thought|strategic\s*instructions|critique\s*&\s*refinement\s*instructions|mandatory\s*rules)[:\s]*$",
    r"^---+$",
    r"^\*\*\*+$",
    r"^===+$",
    r"^___+$",
]

END_META_PATTERNS = [
    r"^(?:hope\s+this\s+helps|let\s+me\s+know\s+if|feel\s+free\s+to|what\s+do\s+you\s+think|i\s+hope\s+you\s+like)[^.\n]*[.!?:)]*$",
    r"^(?:note|tips?|explanation|character\s*count|char\s*count|word\s*count)[:\s]+.*$",
    # Match only bare section-label lines (no trailing sentence text).
    # e.g. "Reflect:" or "**View**" — NOT "Reflect on your journey..." or "View this as..."
    r"^[\*#_\[\]\s]*(?:reflect|view|require|critique)[\*#_\[\]:\s]*$",
    r"^---+$",
    r"^\*\*\*+$",
    r"^===+$",
    r"^___+$",
]

SECTION_CUTOFF_PATTERNS = [
    r"^[\*#_\[\]\s]*(?:reflect|view|require|critique|analysis|strategic\s+instructions|chain\s+of\s+thought|refinement\s+instructions)[\*#_\[\]:\s]*$",
    r"^[\*#_\[\]\s]*(?:i\s+(?:have\s+)?(?:made|applied|incorporated|followed)\s+(?:the\s+following|these|the)?\s*(?:changes|modifications|adjustments|edits|refinements|revisions|requirements)?|this\s+(?:revised|updated|polished|final)?\s*post\s+(?:meets|incorporates|reflects)|here\s+(?:is\s+how|are\s+the\s+changes)|critique\s+addressed|improvements\s+made|changes\s+made|requirements\s+met|summary\s+of\s+changes|notes\s+on\s+revisions?|explanation\s+of\s+changes?)[\*#_\[\]:\s]*.*$",
    r"^(?:\*|\d+[\.\)])\s+(?:punchier\s+hook|better\s+whitespace|stronger\s+cta|emoji\s+adjustment|character\s+count|clean\s+paragraph|no\s+explanatory|return\s+only|no\s+placeholder|condensed|removed\s+unnecessary|used\s+\d|applied\s+clean|preserved\s+the|wrote\s+every|returned\s+only)[:\s]+.*$",
]


def chat(prompt: str, max_tokens: int = 600, temperature: float = 0.7) -> str:
    """Send a prompt to the local llama3.2 model via Ollama and return the response text."""
    response = client.chat.completions.create(
        model=DEFAULT_MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=temperature
    )
    return response.choices[0].message.content or ""


def decode_html_entities(text: str) -> str:
    """
    Decodes HTML entities and replaces them with clean readable symbols.
    Handles single, double, and triple-encoded entities iteratively.
    """
    if not text:
        return ""

    replacements = {
        "&#039;": "'",
        "&#39;": "'",
        "&#x27;": "'",
        "&#X27;": "'",
        "&apos;": "'",
        "&lsquo;": "'",
        "&rsquo;": "'",
        "\u2018": "'",
        "\u2019": "'",
        "&#34;": '"',
        "&#x22;": '"',
        "&quot;": '"',
        "&ldquo;": '"',
        "&rdquo;": '"',
        "\u201c": '"',
        "\u201d": '"',
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&mdash;": "—",
        "&ndash;": "–",
        "&hellip;": "…",
        "&nbsp;": " ",
        "\\\\'": "'",
        "\\'": "'",
        '\\"': '"',
    }

    # Iteratively unescape double-encoded entities (e.g. &amp;#039; -> &#039; -> ')
    for _ in range(5):
        prev = text
        text = html.unescape(text)
        for entity, val in replacements.items():
            text = text.replace(entity, val)
        if text == prev:
            break

    # Numeric and hex entities fallback
    def _sub_dec(m):
        try:
            val = int(m.group(1))
            return chr(val) if val < 65536 else m.group(0)
        except Exception:
            return m.group(0)

    def _sub_hex(m):
        try:
            val = int(m.group(1), 16)
            return chr(val) if val < 65536 else m.group(0)
        except Exception:
            return m.group(0)

    text = re.sub(r'&#(\d+);', _sub_dec, text)
    text = re.sub(r'&#x([0-9a-fA-F]+);', _sub_hex, text)
    return text


def sanitize_post_output(text: str) -> str:
    """
    Sanitize and clean generated social media post text to ensure it contains
    strictly the final post content and removes any unused or extraneous lines.
    Includes manual HTML entity decoding.
    """
    if not text:
        return ""

    text = text.strip()

    # 0. Decode HTML entities manually with enhanced function
    text = decode_html_entities(text)

    # 1. Remove surrounding code blocks (e.g. ```markdown ... ``` or ``` ... ```)
    if text.startswith("```"):
        lines = text.splitlines()
        if len(lines) >= 2 and lines[-1].strip().startswith("```"):
            text = "\n".join(lines[1:-1]).strip()
        elif lines[0].startswith("```"):
            text = "\n".join(lines[1:]).strip()

    # 2. Remove surrounding quotation marks if wrapped completely
    if (text.startswith('"') and text.endswith('"')) or (text.startswith("'") and text.endswith("'")):
        text = text[1:-1].strip()

    raw_lines = [line.rstrip() for line in text.splitlines()]

    # 3. Strip starting meta lines
    idx_start = 0
    while idx_start < len(raw_lines):
        line = raw_lines[idx_start].strip()
        if not line:
            idx_start += 1
            continue
        matched = any(re.match(pat, line, flags=re.IGNORECASE) for pat in START_META_PATTERNS)
        if matched:
            idx_start += 1
        else:
            break

    # 4. Check for meta section cutoffs (e.g. Reflect:, View:, Require:, I made changes: appended after post)
    cutoff_idx = None
    for i in range(idx_start, len(raw_lines)):
        line_str = raw_lines[i].strip()
        if any(re.match(pat, line_str, flags=re.IGNORECASE) for pat in SECTION_CUTOFF_PATTERNS):
            cutoff_idx = i
            break
    if cutoff_idx is not None:
        raw_lines = raw_lines[:cutoff_idx]

    # 5. Strip ending meta lines
    idx_end = len(raw_lines)
    while idx_end > idx_start:
        line = raw_lines[idx_end - 1].strip()
        if not line:
            idx_end -= 1
            continue
        matched = any(re.match(pat, line, flags=re.IGNORECASE) for pat in END_META_PATTERNS)
        if matched:
            idx_end -= 1
        else:
            break

    sub_lines = raw_lines[idx_start:idx_end]
    final_lines = []
    consecutive_blank = 0

    # 6. Clean line-by-line: remove dividers, strip label prefixes, collapse multiple blank lines
    for line in sub_lines:
        s_line = line.strip()

        # Remove horizontal dividers inside output
        if re.match(r"^(?:---|===|\*\*\*|___)\s*$", s_line):
            continue

        # Remove unfilled model placeholders, e.g. "[Insert links here]", "[Add CTA]", "[Your headline]"
        if re.match(r"^\[(?:insert|add|your|include|put|place|enter|write|replace|use|mention|link|resource|cta|headline|body|content|text|url|handle|username|company|name|date|time|number|image|video|photo|hashtag)[^\]]*\]$", s_line, flags=re.IGNORECASE):
            continue

        # Remove lines that are only a "further learning:" / "resources below:" bridge to a now-removed placeholder
        if re.match(r"^(?:explore|check out|see|find|visit|click|access)\s+.{0,60}(?:below|here|above|resources?|links?|more)[:\s]*$", s_line, flags=re.IGNORECASE):
            continue

        # If line starts with "Hashtags:" or "Tags:", strip the prefix but keep tags
        if re.match(r"^(?:hashtags?|tags?):\s*", s_line, flags=re.IGNORECASE):
            s_line = re.sub(r"^(?:hashtags?|tags?):\s*", "", s_line, flags=re.IGNORECASE).strip()

        if not s_line:
            consecutive_blank += 1
            # Allow at most 1 empty line between content lines (i.e. double newline)
            if consecutive_blank == 1 and final_lines:
                final_lines.append("")
        else:
            consecutive_blank = 0
            if s_line.startswith("> "):
                s_line = s_line[2:].strip()
            elif s_line.startswith(">"):
                s_line = s_line[1:].strip()
            final_lines.append(s_line)

    # 7. Remove unused leading/trailing empty lines
    while final_lines and not final_lines[0].strip():
        final_lines.pop(0)
    while final_lines and not final_lines[-1].strip():
        final_lines.pop()

    res = "\n".join(final_lines).strip()
    return res if res else text


def clean_output(text: str) -> str:
    """Alias for sanitize_post_output."""
    return sanitize_post_output(text)


def extract_hashtags(text: str) -> list:
    """Extract hashtags from text."""
    matches = re.findall(r'#\w+', text)
    seen = set()
    return [h for h in matches if not (h.lower() in seen or seen.add(h.lower()))]


def generate_social_post(
    subject: str,
    tone: str = "enthusiastic",
    key_message: str = "",
    target_audience: str = "General Audience",
    length: str = "medium",
    include_emojis: str = "engaging",
    platform: str = "linkedin",
    deep_reflection: bool = True,
    reference_context: str = ""
) -> Dict[str, Any]:
    """
    Multi-stage AI generation pipeline using local llama3.2 (Ollama):
    1. Chain-of-Thought planning tailored to platform, tone, audience, length, key message, and reference documents.
    2. Initial Draft generation grounded in reference facts.
    3. Reflect / View / Require critique & analysis.
    4. Refined final social media post with pipeline sanitization check.
    """
    platform_key = platform.lower().strip()
    platform_info = PLATFORM_SPECS.get(platform_key, PLATFORM_SPECS["linkedin"])
    platform_name = platform_info["name"]
    platform_style = platform_info["style_guide"]
    char_limit = platform_info["char_limit"]

    emoji_guideline = EMOJI_DESCRIPTIONS.get(str(include_emojis).lower(), EMOJI_DESCRIPTIONS["engaging"])

    # Resolve length to a strict word count constraint
    length_str = str(length).strip()
    length_numeric = re.sub(r'\s*words?$', '', length_str, flags=re.IGNORECASE).strip()
    if length_numeric.isdigit():
        target_words = int(length_numeric)
        length_guideline = f"STRICT TARGET: Approximately {target_words} words. DO NOT exceed {int(target_words * 1.15)} words total."
    elif length_str.lower() in LENGTH_DESCRIPTIONS:
        preset_map = {"short": 70, "medium": 140, "long": 260}
        target_words = preset_map.get(length_str.lower(), 140)
        length_guideline = LENGTH_DESCRIPTIONS[length_str.lower()] + f" (hard limit: maximum {int(target_words * 1.15)} words)"
    elif length_numeric.lower() in LENGTH_DESCRIPTIONS:
        preset_map = {"short": 70, "medium": 140, "long": 260}
        target_words = preset_map.get(length_numeric.lower(), 140)
        length_guideline = LENGTH_DESCRIPTIONS[length_numeric.lower()] + f" (hard limit: maximum {int(target_words * 1.15)} words)"
    else:
        target_words = 140
        length_guideline = length_str

    # Dynamic token budget according to target word count
    draft_tokens = max(140, min(700, int(target_words * 2.2) + 60))
    refine_tokens = max(160, min(800, int(target_words * 2.4) + 80))

    key_message_section = f"\nKey Message / Core Thesis: {key_message}" if key_message.strip() else ""
    target_audience_section = f"\nTarget Audience: {target_audience}" if target_audience.strip() else ""
    reference_section = f"\n\nSource / Reference Documents:\n\"\"\"\n{reference_context.strip()}\n\"\"\"\n" if reference_context.strip() else ""

    # ============================================
    # Stage 1: Chain-of-Thought Instructions
    # ============================================
    cot_prompt = f"""You are an elite social media content strategist specializing in high-converting, viral content for {platform_name}.
Your goal is to plan a high-performing {platform_name} post.

Subject: {subject}
Tone: {tone}{key_message_section}{target_audience_section}
Target Platform: {platform_name}
Target Length: {length_guideline}
Emoji Preference: {emoji_guideline}
Platform Best Practices: {platform_style}{reference_section}

Generate a step-by-step Chain of Thought plan to create this post:
1. Extract key facts, data points, statistics, quotes, or core insights from the Source Documents (if provided) that fit into a {target_words}-word post.
2. Identify the scroll-stopping hook tailored for {platform_name}.
3. Break down the core components and key message for {target_audience or 'the audience'}.
4. Structure the flow with smooth transitions and formatting tailored for {platform_name}.
5. Determine the Call to Action (CTA) and relevant hashtags.
6. Ensure the tone is authentically {tone}, length stays strictly around {target_words} words, and adheres to the emoji rules ({include_emojis})."""

    cot_instructions = chat(cot_prompt, max_tokens=550, temperature=0.7)

    # ============================================
    # Stage 2: Initial Draft Generation
    # ============================================
    draft_prompt = f"""You are an expert {platform_name} copywriter.
Here are the strategic instructions to follow:

---
{cot_instructions}
---
{reference_section}
Create the complete {platform_name} post now based strictly on these instructions and grounded in the source reference material.
Platform Requirements:
- Platform: {platform_name} (Max {char_limit} characters)
- Tone: {tone}
- Strict Length: {length_guideline} (Keep the post concise and strictly within {target_words} words total)
- Emoji requirement: {emoji_guideline}
- Output ONLY the post text (including appropriate spacing and hashtags at the end). Do not include introductory notes or meta-commentary.
- Do NOT include any placeholder tokens such as [Insert X], [Add Y here], [Your Z], or similar. Every part of the post must be fully written out and ready to publish."""

    draft_content = chat(draft_prompt, max_tokens=draft_tokens, temperature=0.7)

    if not deep_reflection:
        # Fast mode: apply sanitization check
        cleaned_post = sanitize_post_output(draft_content)
        hashtags = extract_hashtags(cleaned_post)
        return {
            "content": cleaned_post,
            "character_count": len(cleaned_post),
            "word_count": len(cleaned_post.split()),
            "hashtags": hashtags,
            "platform": platform_name,
            "reflection": "Fast generation mode selected (skipped reflection analysis).",
            "cot_plan": cot_instructions
        }

    # ============================================
    # Stage 3: Reflect / View / Require Analysis
    # ============================================
    reflect_prompt = f"""Based on the following draft {platform_name} post about "{subject}", perform a structured critique with exactly three sections:

Reflect – A brief reflection on the hook, key takeaway, accuracy against the reference source material, whether word count fits ({target_words} words target), and whether the tone ({tone}) and audience alignment ({target_audience}) landed effectively.
View – A sharp perspective on why this topic matters to the audience and how to elevate its perceived value/engagement.
Require – Specific tactical refinements needed (e.g. punchier hook, better whitespace formatting, stronger CTA, word count adherence around {target_words} words, emoji adjustment per rule: {include_emojis}, character count constraint for {platform_name}).

Draft {platform_name} Post:
---
{draft_content}
---

Return the output in exactly this format:
Reflect:
[reflection]

View:
[opinion or perspective]

Require:
[actionable improvements]"""

    reflect_content = chat(reflect_prompt, max_tokens=450, temperature=0.7)

    # ============================================
    # Stage 4: Refined Final Polish & Sanitization
    # ============================================
    refine_prompt = f"""You are a master social media copywriter and editor.
Refine and elevate the original {platform_name} post using the Reflect, View, and Require critique below.

Original Draft:
---
{draft_content}
---

Critique & Refinement Instructions:
---
{reflect_content}
---
{reference_section}
Mandatory Rules:
1. Deliver the final polished post optimized for {platform_name}.
2. Ensure factual grounding and accuracy based on the provided reference documents.
3. Preserve the {tone} tone and ensure it speaks directly to {target_audience or 'the audience'}.
4. Strict Length Constraint: {length_guideline}. Do NOT exceed approximately {target_words} words.
5. Emoji requirement: {emoji_guideline}.
6. Apply clean paragraph breaks and hooks for high readability on mobile.
7. Do NOT include words like 'Reflect:', 'View:', 'Require:', or explanatory meta-text.
8. Do NOT include any placeholder tokens such as [Insert link], [Add CTA here], [Your company], etc. Write every element fully.
9. NEVER append any notes, change lists, or summary explaining what you edited (do NOT write 'I made the following changes...', 'Here is what was changed', or any numbered revision list).
10. Return ONLY the final post text ready to publish and stop immediately."""

    final_post = chat(refine_prompt, max_tokens=refine_tokens, temperature=0.7) or draft_content
    cleaned_final_post = sanitize_post_output(final_post)
    hashtags = extract_hashtags(cleaned_final_post)

    return {
        "content": cleaned_final_post,
        "character_count": len(cleaned_final_post),
        "word_count": len(cleaned_final_post.split()),
        "hashtags": hashtags,
        "platform": platform_name,
        "reflection": reflect_content,
        "cot_plan": cot_instructions,
        "draft": draft_content
    }


if __name__ == "__main__":
    print("Testing generate_social_post with local llama3.2 (Ollama)...")
    result = generate_social_post(
        subject="AI Agents in 2026",
        tone="enthusiastic",
        key_message="Autonomous agents are shifting from passive chatbots to active co-pilots.",
        target_audience="Tech founders and engineers",
        length="150",
        include_emojis="engaging",
        platform="linkedin"
    )
    print("\n--- Final Generated Post ---")
    print(result["content"])
    print(f"\nStats: {result['character_count']} chars, {result['word_count']} words")
    print(f"Hashtags: {result['hashtags']}")