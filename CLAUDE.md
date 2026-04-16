# Odyssey Shipments — Project Instructions

## Reading .docx and .pptx files

Before analyzing any `.docx` or `.pptx` file, run the conversion script first:

```bash
bash tools/convert-docs.sh
```

This converts all documents in `shipments-documentation/` to readable Markdown in `shipments-documentation/Documentation/converted/`:
- `.pptx` → Markdown (text + tables)
- `.docx` → Markdown (text + tables + extracted images in `<name>_images/`)

Then read the `.md` files instead of the originals. For docx images, read the extracted `.png` files from the `<name>_images/` folder.

The script skips files already converted (checks timestamps), so re-running is fast.

**Dependencies:** python-pptx + python-docx (venv auto-created at `/tmp/pptx_env` if missing)
