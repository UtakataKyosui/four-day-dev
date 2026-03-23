import asyncio
import json
import os
import re
from typing import Any

from claude_agent_sdk import AssistantMessage, ClaudeAgentOptions, ResultMessage, query

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")


def build_prompt(req: dict[str, Any]) -> str:
    meal_labels = {
        "breakfast": "朝食",
        "lunch": "昼食",
        "dinner": "夕食",
    }

    meals = req.get("meals") or []
    meal_lines = []
    for meal_type in ["breakfast", "lunch", "dinner"]:
        meal = next((m for m in meals if m.get("meal_type") == meal_type), None)
        meal_lines.append(f"- {meal_labels[meal_type]}: {(meal or {}).get('notes') or '未記録'}")

    sleep = req.get("sleep")
    sleep_lines = "- 睡眠データなし"
    if sleep:
        duration = int(sleep.get("duration_minutes", 0) or 0)
        hours = duration // 60
        mins = duration % 60
        lines = [f"- 睡眠時間: {hours}時間{f'{mins}分' if mins > 0 else ''}（目安: 成人7〜9時間）"]
        if sleep.get("efficiency") is not None:
            lines.append(f"- 睡眠効率: {sleep['efficiency']}%")
        if sleep.get("stages_deep_minutes") is not None:
            lines.append(f"- 深い睡眠: {sleep['stages_deep_minutes']}分")
        if sleep.get("stages_rem_minutes") is not None:
            lines.append(f"- REM睡眠: {sleep['stages_rem_minutes']}分")
        if sleep.get("stages_wake_minutes") is not None:
            lines.append(f"- 覚醒: {sleep['stages_wake_minutes']}分")
        sleep_lines = "\n".join(lines)

    meal_section = "\n".join(meal_lines)
    return (
        "あなたは健康アドバイザーです。以下の1日のデータを分析して、JSON形式で回答してください。\n\n"
        f"DATE: {req.get('date', '(日付不明)')}\n\n"
        "【食事】\n"
        f"{meal_section}\n\n"
        "【睡眠】\n"
        f"{sleep_lines}\n\n"
        "以下のJSON形式のみで回答してください（説明文不要）:\n"
        "{\n"
        '  "meal_score": 0から100の整数（記録がない場合は50とする）,\n'
        '  "sleep_score": 0から100の整数（データなし時は50）,\n'
        '  "overall_score": 0から100の整数,\n'
        '  "summary": "マークダウン形式の詳細評価（日本語、3〜5文）",\n'
        '  "recommendations": [\n'
        "    {\n"
        '      "category": "meal または sleep または lifestyle",\n'
        '      "text": "具体的なアドバイス（日本語）",\n'
        '      "priority": "high または medium または low"\n'
        "    }\n"
        "  ]\n"
        "}\n"
    )


def parse_response(text: str) -> dict[str, Any]:
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        json_str = match.group(1)
    else:
        brace_match = re.search(r"(\{[\s\S]*\})", text)
        json_str = brace_match.group(1) if brace_match else text.strip()

    try:
        parsed = json.loads(json_str)
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM response JSON parse failed: {e}\nraw: {json_str[:200]}") from e

    def clamp(value: Any, default: int) -> int:
        number = value if isinstance(value, (int, float)) else default
        return max(0, min(100, round(number)))

    recommendations = []
    for rec in parsed.get("recommendations") or []:
        if not isinstance(rec, dict):
            continue
        category = rec.get("category") if rec.get("category") in {"meal", "sleep", "lifestyle"} else "lifestyle"
        priority = rec.get("priority") if rec.get("priority") in {"high", "medium", "low"} else "medium"
        recommendations.append(
            {
                "category": category,
                "text": str(rec.get("text") or ""),
                "priority": priority,
            }
        )

    return {
        "meal_score": clamp(parsed.get("meal_score"), 50),
        "sleep_score": clamp(parsed.get("sleep_score"), 50),
        "overall_score": clamp(parsed.get("overall_score"), 50),
        "summary": str(parsed.get("summary") or ""),
        "recommendations": recommendations,
    }


async def _run_health_analysis(req: dict[str, Any]) -> dict[str, Any]:
    assistant_text: list[str] = []
    usage: dict[str, Any] | None = None

    async for message in query(
        prompt=build_prompt(req),
        options=ClaudeAgentOptions(
            model=MODEL,
            max_turns=3,
            allowed_tools=[],
        ),
    ):
        if isinstance(message, AssistantMessage):
            for block in getattr(message, "content", []):
                text = getattr(block, "text", None)
                if isinstance(text, str):
                    assistant_text.append(text)
        elif isinstance(message, ResultMessage):
            if message.is_error:
                raise RuntimeError(message.result or "Claude Agent SDK execution failed")
            usage = message.usage or {}
            if isinstance(message.result, str) and message.result:
                assistant_text.append(message.result)

    parsed = parse_response("\n".join(assistant_text).strip())
    parsed["usage"] = {
        "prompt_tokens": int((usage or {}).get("input_tokens", 0) or 0),
        "completion_tokens": int((usage or {}).get("output_tokens", 0) or 0),
    }
    return parsed


def run_health_analysis(payload_json: str) -> str:
    payload = json.loads(payload_json)
    result = asyncio.run(_run_health_analysis(payload))
    return json.dumps(result, ensure_ascii=False)
