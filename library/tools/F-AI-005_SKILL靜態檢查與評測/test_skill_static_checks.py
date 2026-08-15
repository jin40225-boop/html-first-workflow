import os
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CODEX_SKILLS = Path(os.environ.get("USERPROFILE", str(Path.home()))) / ".codex" / "skills"

TODAY_SKILL_NAMES = [
    "codex-skill-builder",
    "ai-presentation-prompt-director",
    "activity-poster-director",
    "common-document-factory",
    "ai-project-packager",
    "activity-form-factory",
    "line-assistant-builder",
]

SKILL_DIRS = [CODEX_SKILLS / name for name in TODAY_SKILL_NAMES]
SKILLS = [skill_dir / "SKILL.md" for skill_dir in SKILL_DIRS]

BLOCKED_TERMS = [
    "api_key",
    "apikey",
    "secret_access_key",
    "private_key",
    "BEGIN RSA PRIVATE KEY",
    "BEGIN OPENSSH PRIVATE KEY",
]


def read_skill(path: Path) -> str:
    assert path.exists(), f"Missing skill file: {path}"
    return path.read_text(encoding="utf-8")


def parse_frontmatter(text: str) -> dict[str, str]:
    assert text.startswith("---\n"), "SKILL.md must start with YAML frontmatter"
    end = text.find("\n---", 4)
    assert end != -1, "SKILL.md frontmatter must close with ---"
    frontmatter = {}
    for raw_line in text[4:end].splitlines():
        if not raw_line.strip():
            continue
        key, sep, value = raw_line.partition(":")
        assert sep, f"Invalid frontmatter line: {raw_line}"
        frontmatter[key.strip()] = value.strip().strip("\"'")
    return frontmatter


def markdown_links(text: str) -> list[str]:
    return re.findall(r"\[[^\]]+\]\(([^)]+)\)", text)


def test_deepeval_imports():
    import deepeval

    assert deepeval is not None


def test_expected_today_skills_exist():
    for skill_dir in SKILL_DIRS:
        assert skill_dir.exists(), f"Missing local skill directory: {skill_dir}"


def test_skill_files_are_not_empty():
    for skill in SKILLS:
        text = read_skill(skill)
        assert len(text.strip()) > 500, f"Skill looks too small to be useful: {skill}"


def test_skill_frontmatter_is_minimal_and_matches_folder():
    for skill in SKILLS:
        text = read_skill(skill)
        frontmatter = parse_frontmatter(text)
        assert set(frontmatter) == {"name", "description"}, f"Unexpected frontmatter keys in {skill}"
        assert frontmatter["name"] == skill.parent.name, f"Skill name should match folder name: {skill}"
        assert len(frontmatter["description"]) >= 120, f"Description should carry trigger detail: {skill}"


def test_skill_files_include_trigger_and_workflow_language():
    for skill in SKILLS:
        text = read_skill(skill).lower()
        assert "use when" in text, f"Missing trigger guidance: {skill}"
        assert any(term in text for term in ["workflow", "process", "approval", "approve"]), (
            f"Missing workflow or approval guidance: {skill}"
        )


def test_openai_yaml_exists_for_each_skill():
    for skill_dir in SKILL_DIRS:
        metadata = skill_dir / "agents" / "openai.yaml"
        assert metadata.exists(), f"Missing agents/openai.yaml: {skill_dir}"
        assert metadata.read_text(encoding="utf-8").strip(), f"Empty agents/openai.yaml: {metadata}"


def test_referenced_markdown_files_exist():
    for skill in SKILLS:
        text = read_skill(skill)
        for link in markdown_links(text):
            if "://" in link or link.startswith("#"):
                continue
            target = link.split("#", 1)[0]
            if not target or target.startswith("mailto:"):
                continue
            assert (skill.parent / target).exists(), f"Broken local markdown link in {skill}: {link}"


def test_skill_files_do_not_contain_obvious_secrets():
    for skill in SKILLS:
        text = read_skill(skill)
        lowered = text.lower()
        for term in BLOCKED_TERMS:
            assert term.lower() not in lowered, f"Possible secret marker found in {skill}: {term}"
