# Vybz Chronicles — source map (Chat 1 + Chat 2)

Use this when drafting a Chronicle: each row is one episode-sized arc, **oldest → newest**.  
Primary sources are your exported Cursor chats (absolute paths on this machine).

| Ep | Working title (drafting hook) | Source file | What to search / read |
|---|------------------------------|-------------|------------------------|
| 1 | **Todos, serializers, and seasons** | Chat 1 | `**User**` blocks from the start: outstanding todos, serializer fixes, “yes please”, season editing blocked |
| 2 | **Import, timestamps, and the model** | Chat 1 | import, timestamp, migration, seamless import from another Django app |
| 3 | **Episodes that wouldn’t load** | Chat 1 | episodes URL, loading, routing to episode |
| 4 | **API tests and the TypeScript cracks** | Chat 1 | DialogueCard, `character`, DialoguesStep, Partial<Dialogue>, fix API tests |
| 5 | **The dialogue saves that kept failing** | Chat 1 | save draft 400, POST dialogue 400, form hasn’t changed, camera data, wizard vs Django |
| 6 | **POV: who is actually speaking** | Chat 1 | POV, speaking character, product clarification (not only admin UI) |
| 7 | **Parity: Django path vs React wizard** | Chat 1 | Comic/story workflow refresher, dialogue parity, camera fields on wizard, progressive saving |
| 8 | **Stories page and StoryManage** | Chat 1 | characters on Stories, create tests, StoryManage loading, still persists |
| 9 | **The place the terminal wasn’t looking** | Chat 2 | Open: React restart, jaq worktree, `vybzapp/frontend` vs worktree, `npm start`, canonical directory |
| 10 | **Editor drift (which copy is real?)** | Chat 2 | EpisodeManage jaq vs main, patch on wrong repo, sync files, POV in manage UI |
| 11 | **When a “view” counts** | Chat 2 | incrementEpisodeView, view_count, published, last dialogue Next, traffic log / analytics |
| 12 | **Polish users feel** | Chat 2 | guide modal, interactive guide, dialogue cards, small UX (optional to merge with neighbors) |
| 13 | **What the dialogue box was really showing** | Chat 2 | TinyMCE, HTML in API, strip when editing, EpisodeManage edit dialogue |
| 14 | **The repository that thought it was two** | Chat 2 | `.gitignore`, nested ignore, build artifacts, `git pull` blocked, remove log from index, worktree remove |
| 15 | **3D: all the motions, then the speed** | Chat 2 | Comic3DViewer, AnimationController, list/play GLB clips, `timeScale`, Speed control, Blender vs browser |
| 16 | **One world, many stories** | Chat 2 | shared GLB, locations, pilot unchanged, new stories get new locations, file size / scale |

## File paths

- **Chat 1 (older thread):** `/home/chris/Documents/projects/jv/cursor_chat 1.md`  
  (Same conversation family as `cursor_activate_the_vybz_virtual_enviro.md` if you keep both exports.)
- **Chat 2 (newer thread):** `/home/chris/Documents/projects/jv/cursor_chat 2.md`

## Notes for drafting

- **Voice / structure:** Land-development example + agreed skeleton in Chat 2 (hook after “Chronicles:”, stakes, method, “however”, acceptance, quiet close). Semi-technical audience; emphasize *function and confusion*, not file names only.
- **Chat 1 is dense:** Read in chunks or grep by keywords in the third column; order episodes by **how the work actually unfolded** in the export (retries stay in the story).
- **Overlap:** POV appears in Chat 1 (meaning of the field) and Chat 2 (admin/UI and drift). Split by **which confusion** you’re telling, or merge in revision.
- **Merges:** You can combine 4+5 or 6+7 if two Chronicles feel thin; this table is the **maximum** granularity aligned with both chats.
