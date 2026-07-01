import unittest

from llm_architecture_svg import trace_hf_config


class TracerTests(unittest.TestCase):
    def test_llama_config_repeated_blocks(self):
        spec = trace_hf_config({
            "model_type": "llama",
            "hidden_size": 4096,
            "num_attention_heads": 32,
            "num_hidden_layers": 100,
            "vocab_size": 32000,
            "max_position_embeddings": 4096,
            "intermediate_size": 11008,
            "tie_word_embeddings": False,
        }, model_name="LLaMA-like")
        self.assertEqual(spec["kind"], "model-graph")
        self.assertEqual(spec["architecture"]["family"], "decoder-only")
        self.assertEqual(spec["repeatedBlocks"][0]["count"], 100)
        self.assertEqual(spec["architecture"]["params"]["C"], 4096)

    def test_bert_config_family(self):
        spec = trace_hf_config({
            "model_type": "bert",
            "hidden_size": 768,
            "num_attention_heads": 12,
            "num_hidden_layers": 12,
            "vocab_size": 30522,
            "type_vocab_size": 2,
        })
        self.assertEqual(spec["architecture"]["family"], "bert")
        self.assertEqual(spec["architecture"]["params"]["typeVocabSize"], 2)

    def test_t5_config_family(self):
        spec = trace_hf_config({
            "model_type": "t5",
            "is_encoder_decoder": True,
            "d_model": 512,
            "num_heads": 8,
            "num_layers": 6,
            "num_decoder_layers": 6,
            "vocab_size": 32128,
            "d_ff": 2048,
        })
        self.assertEqual(spec["architecture"]["family"], "transformer")
        self.assertEqual(spec["architecture"]["params"]["nEncoderBlocks"], 6)
        self.assertEqual(spec["architecture"]["params"]["nDecoderBlocks"], 6)


if __name__ == "__main__":
    unittest.main()
