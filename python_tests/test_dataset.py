import tempfile
import unittest
from pathlib import Path

from ddo_optimizer.dataset import load_dataset_file, normalize_dataset


class DatasetTests(unittest.TestCase):
    def test_normalize_dataset_accepts_aliases(self):
        examples = normalize_dataset(
            [
                {"question": "Q1", "answer": "A1", "rubric": "R1", "tags": "math;format"},
                "Free-form input",
            ]
        )
        self.assertEqual(len(examples), 2)
        self.assertEqual(examples[0]["input"], "Q1")
        self.assertEqual(examples[0]["expected"], "A1")
        self.assertEqual(examples[0]["tags"], ["math", "format"])

    def test_load_jsonl_dataset(self):
        with tempfile.TemporaryDirectory() as directory:
            file_path = Path(directory) / "data.jsonl"
            file_path.write_text('{"input":"Q","expected":"A"}\n', encoding="utf-8")
            examples = load_dataset_file(file_path)
        self.assertEqual(examples[0]["input"], "Q")
        self.assertEqual(examples[0]["expected"], "A")


if __name__ == "__main__":
    unittest.main()
