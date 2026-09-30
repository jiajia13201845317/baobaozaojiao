# Fonts

`NotoSansSC-Regular.otf` and `NotoSansSC-Bold.otf`, from Google's Noto Sans SC
(a Source Han Sans derivative), under the SIL Open Font License 1.1 — see
`LICENSE`.

They are committed rather than fetched because the build needs them: every
glyph the firmware can draw is baked into the GSP bundle at build time, and a
character that was not baked comes out blank on the panel. `ui/charset.txt`,
generated from the C sources by `tools/build_gen.py`, lists exactly which
glyphs that is.

The full faces are here, not a subset of the current charset, because the
charset changes whenever a caption or a lyric does. A subset would make adding
one line a two-step job with an external download in the middle.
