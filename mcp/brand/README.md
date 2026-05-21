# OpenLawFirm MCP brand assets

Assets required for the Anthropic Connectors Directory submission.

## Files

| File | Use | Size |
|---|---|---|
| `openlawfirm-mcp-logo.svg` | Primary logo. Used on the directory listing, in Claude's connector picker, and as a favicon source. | 512×512 (scalable) |

## Logo design notes

The mark depicts a scales-of-justice motif rendered as an MCP "connector" — two balanced data flows joined at a central pillar. Conceptually:

- The **central pillar** is OpenLawFirm — the system of record. The firm's matters, time, trust, and documents.
- The **left pan** is the firm's data flowing into Claude.
- The **right pan** is Claude's intelligence flowing back into the firm's workflows.
- The **crossbeam** is the MCP fabric — the bidirectional connection.
- The **chains** represent the structured, audited data flow (not raw access).

## Colors

The mark uses the Open Scaffold Labs brand palette per `openscaffold-core/DOCUMENT-STANDARDS.md`:

- **Electric Indigo `#4F46E5`** — primary background tile
- **`#5048E9`** — inner surface (slightly lighter for visual depth)
- **White `#FFFFFF`** — pillar, pans, beam, chains, wordmark
- **Indigo accent `#4F46E5` at 18% opacity** — pan inner highlight

Navy `#1B3A5C` (the openscaffold-core navy heading color) is reserved for the OpenLawFirm document standards and is not used in the mark itself.

## Generating raster derivatives

Anthropic's submission may require PNG variants. To generate:

```bash
# Requires librsvg (brew install librsvg)
rsvg-convert openlawfirm-mcp-logo.svg -w 512 -h 512 -o openlawfirm-mcp-logo-512.png
rsvg-convert openlawfirm-mcp-logo.svg -w 256 -h 256 -o openlawfirm-mcp-logo-256.png
rsvg-convert openlawfirm-mcp-logo.svg -w 128 -h 128 -o openlawfirm-mcp-logo-128.png
rsvg-convert openlawfirm-mcp-logo.svg -w 64  -h 64  -o openlawfirm-mcp-logo-64.png
rsvg-convert openlawfirm-mcp-logo.svg -w 32  -h 32  -o openlawfirm-mcp-logo-32.png
```

Or use any SVG-to-PNG converter — Figma, Inkscape, ImageMagick (`convert openlawfirm-mcp-logo.svg -resize 512x512 openlawfirm-mcp-logo-512.png`).

## Favicon

Anthropic verifies the favicon at the connector server's domain matches the submitted logo. Once the connector is deployed at `mcp.openlawfirm.openscaffoldlabs.com`, place a 32×32 ICO at `/favicon.ico` derived from this SVG.

## Future iterations

This is a v0.1 mark. Before public launch we may want to:

- Commission a professional designer to refine the geometry (the crossbeam-to-chain transitions are slightly heavy)
- Test the mark at very small sizes (16×16) to ensure the "OLF" wordmark remains legible — currently it may need to be removed at favicon size
- Create a light-mode variant for placement on light backgrounds
- Develop a horizontal lockup that combines the mark with the "OpenLawFirm" wordmark in Times New Roman 11pt per the document standards (for use in slide decks, sales materials)

For Sprint 2 directory submission, the SVG above is sufficient.

## License

These assets are licensed under the same MIT license as the rest of the OpenLawFirm project. See [LICENSE](../../LICENSE).
