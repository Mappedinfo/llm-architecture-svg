from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional


def trace_hf_config(config: Any, model_name: Optional[str] = None) -> Dict[str, Any]:
    cfg = _config_to_dict(config)
    info = _normalize_config(cfg)
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    name = model_name or cfg.get("name_or_path") or cfg.get("model_name") or f"{info['modelType'] or info['family']} model"
    block_count = max(info["nEncoderBlocks"], info["nDecoderBlocks"]) if info["family"] == "transformer" else info["nBlocks"]
    repeated_role = "encoder_decoder_block" if info["family"] == "transformer" else "encoder_block" if info["family"] in {"bert", "encoder-only"} else "decoder_block"
    return {
        "schemaVersion": 1,
        "kind": "model-graph",
        "modelName": name,
        "framework": "huggingface",
        "source": "hf-config",
        "modelType": info["modelType"],
        "architecture": {"family": info["family"], "params": _architecture_params(info)},
        "config": cfg,
        "nodes": _semantic_nodes(info),
        "edges": _semantic_edges(),
        "repeatedBlocks": [{
            "id": "layers",
            "label": "Transformer Layer" if info["family"] == "transformer" else "Encoder Layer" if info["family"] in {"bert", "encoder-only"} else "Decoder Layer",
            "role": repeated_role,
            "count": block_count,
            "modulePattern": "encoder.block.{i} / decoder.block.{i}" if info["family"] == "transformer" else "encoder.layer.{i}" if info["family"] == "bert" else "model.layers.{i}",
            "representativeNodeId": "representative_block",
        }],
        "createdAt": now,
        "updatedAt": now,
    }


def trace_hf_model(model: Any, model_name: Optional[str] = None) -> Dict[str, Any]:
    if not hasattr(model, "config"):
        raise ValueError("trace_hf_model expects an object with a HuggingFace-style .config")
    spec = trace_hf_config(model.config, model_name=model_name or model.__class__.__name__)
    spec["source"] = "hf-model"
    spec["modules"] = _module_tree(model)
    return spec


def trace_torch_fx(model: Any, example_inputs: Optional[Any] = None, model_name: Optional[str] = None) -> Dict[str, Any]:
    try:
        from torch.fx import symbolic_trace
    except Exception as exc:  # pragma: no cover - depends on optional torch
        raise RuntimeError("trace_torch_fx requires PyTorch. Install python package with the [torch] extra.") from exc

    graph_module = symbolic_trace(model)
    fx_nodes = list(graph_module.graph.nodes)
    node_specs: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    for fx_node in fx_nodes:
        node_specs.append({
            "id": str(fx_node.name),
            "label": str(fx_node.target),
            "opType": str(fx_node.op),
            "modulePath": str(fx_node.target) if fx_node.op == "call_module" else None,
            "semanticRole": _role_from_name(str(fx_node.target)),
            "kind": _kind_from_role(_role_from_name(str(fx_node.target))),
        })
        for input_node in _iter_fx_arg_nodes(fx_node.args):
            edges.append({
                "id": f"edge-{input_node.name}-{fx_node.name}",
                "source": str(input_node.name),
                "target": str(fx_node.name),
                "kind": "data",
            })
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    return {
        "schemaVersion": 1,
        "kind": "model-graph",
        "modelName": model_name or model.__class__.__name__,
        "framework": "torch-fx",
        "source": "torch-fx",
        "modelType": model.__class__.__name__,
        "architecture": {"family": "unknown", "params": {}},
        "nodes": node_specs,
        "edges": edges,
        "repeatedBlocks": [],
        "createdAt": now,
        "updatedAt": now,
    }


def _config_to_dict(config: Any) -> Dict[str, Any]:
    if isinstance(config, dict):
        return dict(config)
    if hasattr(config, "to_dict"):
        return dict(config.to_dict())
    if hasattr(config, "__dict__"):
        return {k: v for k, v in vars(config).items() if not k.startswith("_") and _json_scalar(v)}
    raise TypeError("config must be a dict or expose to_dict()")


def _normalize_config(cfg: Dict[str, Any]) -> Dict[str, Any]:
    model_type = str(cfg.get("model_type") or cfg.get("modelType") or "unknown").lower()
    family = _family_from_config(cfg, model_type)
    C = _number(cfg, "hidden_size", "n_embd", "d_model", "C", default=768)
    n_heads = _number(cfg, "num_attention_heads", "n_head", "num_heads", "nHeads", default=12)
    n_blocks = _number(cfg, "num_hidden_layers", "n_layer", "num_layers", "nBlocks", default=12)
    n_encoder = _number(cfg, "num_encoder_layers", "encoder_layers", "nEncoderBlocks", "num_layers", default=n_blocks)
    n_decoder = _number(cfg, "num_decoder_layers", "decoder_layers", "nDecoderBlocks", "num_layers", default=n_blocks)
    T = _number(cfg, "max_position_embeddings", "n_positions", "n_ctx", "seq_length", "T", default=128)
    return {
        "family": family,
        "modelType": model_type,
        "T": T,
        "srcT": _number(cfg, "srcT", "max_source_positions", "max_position_embeddings", default=T),
        "tgtT": _number(cfg, "tgtT", "max_target_positions", "max_position_embeddings", default=T),
        "C": C,
        "nHeads": n_heads,
        "nBlocks": n_blocks,
        "nEncoderBlocks": n_encoder,
        "nDecoderBlocks": n_decoder,
        "vocabSize": _number(cfg, "vocab_size", "vocabSize", default=30522),
        "intermediateSize": _number(cfg, "intermediate_size", "n_inner", "ffn_dim", "d_ff", "intermediateSize", default=C * 4),
        "typeVocabSize": _number(cfg, "type_vocab_size", "typeVocabSize", default=2),
        "numLabels": _number(cfg, "num_labels", "numLabels", default=2),
        "bias": _bool(cfg, "bias", "use_bias", "add_bias_linear", default=True),
        "tieEmbeddings": _bool(cfg, "tie_word_embeddings", "tieEmbeddings", default=True),
    }


def _family_from_config(cfg: Dict[str, Any], model_type: str) -> str:
    hinted = cfg.get("architecture_family")
    if hinted in {"gpt", "decoder-only", "bert", "encoder-only", "transformer"}:
        return str(hinted)
    if cfg.get("is_encoder_decoder") or model_type in {"t5", "bart", "mbart", "marian"}:
        return "transformer"
    if model_type in {"bert", "roberta", "deberta", "deberta-v2", "albert", "electra"}:
        return "bert"
    if model_type in {"gpt2", "gpt_neo", "gpt_neox", "gptj", "llama", "mistral", "mixtral", "qwen2", "gemma", "phi", "falcon"}:
        return "gpt" if model_type == "gpt2" else "decoder-only"
    return "unknown"


def _architecture_params(info: Dict[str, Any]) -> Dict[str, Any]:
    if info["family"] == "transformer":
        return {k: info[k] for k in ["srcT", "tgtT", "C", "nHeads", "nEncoderBlocks", "nDecoderBlocks", "vocabSize", "bias", "tieEmbeddings"]}
    if info["family"] == "bert":
        return {k: info[k] for k in ["T", "C", "nHeads", "nBlocks", "vocabSize", "typeVocabSize", "numLabels", "bias"]}
    return {k: info[k] for k in ["T", "C", "nHeads", "nBlocks", "vocabSize", "bias", "tieEmbeddings"]}


def _semantic_nodes(info: Dict[str, Any]) -> List[Dict[str, Any]]:
    count = max(info["nEncoderBlocks"], info["nDecoderBlocks"]) if info["family"] == "transformer" else info["nBlocks"]
    return [
        {"id": "token_embedding", "label": "Token Embedding", "semanticRole": "token_embedding", "kind": "token_embed", "shape": {"rows": info["vocabSize"], "cols": info["C"]}, "paramCount": info["vocabSize"] * info["C"]},
        {"id": "position_embedding", "label": "Position Embedding", "semanticRole": "positional_encoding", "kind": "pos_embed", "shape": {"T": info["T"], "C": info["C"]}, "paramCount": info["T"] * info["C"]},
        {"id": "representative_block", "label": f"Transformer Block ×{count}", "semanticRole": "encoder_block" if info["family"] in {"bert", "encoder-only"} else "decoder_block", "kind": "group", "shape": {"T": info["T"], "C": info["C"], "nHeads": info["nHeads"], "nBlocks": count}},
        {"id": "head", "label": "Task Heads" if info["family"] == "bert" else "LM Head", "semanticRole": "task_head" if info["family"] == "bert" else "lm_head", "kind": "linear", "shape": {"rows": info["C"], "cols": info["vocabSize"]}, "paramCount": info["C"] * info["vocabSize"]},
    ]


def _semantic_edges() -> List[Dict[str, Any]]:
    ids = ["token_embedding", "position_embedding", "representative_block", "head"]
    return [{"id": f"edge-{a}-{b}", "source": a, "target": b, "kind": "data"} for a, b in zip(ids, ids[1:])]


def _module_tree(model: Any) -> List[Dict[str, Any]]:
    modules = []
    for path, module in model.named_modules():
        if not path:
            continue
        modules.append({
            "path": path,
            "className": module.__class__.__name__,
            "semanticRole": _role_from_name(path),
            "paramCount": sum(p.numel() for p in module.parameters(recurse=False)) if hasattr(module, "parameters") else 0,
        })
    return modules[:2000]


def _iter_fx_arg_nodes(value: Any) -> Iterable[Any]:
    if hasattr(value, "name") and hasattr(value, "op"):
        yield value
    elif isinstance(value, (list, tuple)):
        for item in value:
            yield from _iter_fx_arg_nodes(item)
    elif isinstance(value, dict):
        for item in value.values():
            yield from _iter_fx_arg_nodes(item)


def _role_from_name(name: str) -> str:
    lower = name.lower()
    if "q_proj" in lower or ".q" in lower:
        return "q_proj"
    if "k_proj" in lower or ".k" in lower:
        return "k_proj"
    if "v_proj" in lower or ".v" in lower:
        return "v_proj"
    if "attn" in lower or "attention" in lower:
        return "attention"
    if "mlp" in lower or "ffn" in lower or "feed_forward" in lower:
        return "mlp"
    if "norm" in lower or "ln" in lower:
        return "norm"
    if "embed" in lower:
        return "positional_encoding" if "pos" in lower or "position" in lower else "token_embedding"
    if "head" in lower:
        return "lm_head"
    return "generic"


def _kind_from_role(role: str) -> str:
    if role in {"token_embedding"}:
        return "token_embed"
    if role in {"positional_encoding"}:
        return "pos_embed"
    if "attention" in role or role in {"q_proj", "k_proj", "v_proj"}:
        return "attention"
    if role == "mlp":
        return "mlp"
    if role == "norm":
        return "layer_norm"
    if role == "lm_head":
        return "linear"
    return "generic_tensor"


def _number(cfg: Dict[str, Any], *keys: str, default: int) -> int:
    for key in keys:
        value = cfg.get(key)
        if isinstance(value, (int, float)):
            return int(value)
        if isinstance(value, str) and value.isdigit():
            return int(value)
    return int(default)


def _bool(cfg: Dict[str, Any], *keys: str, default: bool) -> bool:
    for key in keys:
        value = cfg.get(key)
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            if value.lower() in {"true", "1", "yes", "on"}:
                return True
            if value.lower() in {"false", "0", "no", "off"}:
                return False
    return default


def _json_scalar(value: Any) -> bool:
    return value is None or isinstance(value, (str, int, float, bool, list, dict))
