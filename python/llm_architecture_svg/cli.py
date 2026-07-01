from __future__ import annotations

import argparse
import json
from pathlib import Path

from .tracer import trace_hf_config


def main() -> None:
    parser = argparse.ArgumentParser(description="Export HuggingFace/PyTorch model structure as ModelGraphSpec JSON.")
    parser.add_argument("--config", help="Path to a HuggingFace config JSON file.")
    parser.add_argument("--model", help="Local config path or HuggingFace model id. Uses AutoConfig for remote ids when transformers is installed.")
    parser.add_argument("--model-name", help="Override output modelName.")
    parser.add_argument("--level", default="overview", choices=["overview", "representative-block", "layer-strip", "debug-graph"], help="Recorded preference for downstream rendering.")
    parser.add_argument("--out", required=True, help="Output ModelGraphSpec JSON path.")
    args = parser.parse_args()

    config_source = args.config or args.model
    if not config_source:
        parser.error("Provide --config or --model.")

    config = _load_config(config_source)
    spec = trace_hf_config(config, model_name=args.model_name)
    spec.setdefault("metadata", {})
    spec["metadata"] = {"preferredLevel": args.level}

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(spec, indent=2), encoding="utf8")
    print(f"Wrote {out}")


def _load_config(source: str):
    path = Path(source)
    if path.exists():
        return json.loads(path.read_text(encoding="utf8"))
    try:
        from transformers import AutoConfig
    except Exception as exc:
        raise SystemExit("Remote --model requires transformers. Install python package with the [hf] extra.") from exc
    return AutoConfig.from_pretrained(source).to_dict()


if __name__ == "__main__":
    main()
