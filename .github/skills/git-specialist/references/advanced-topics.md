# Advanced Git Topics

Detailed reference for specialized Git scenarios. Load this file when the user's question goes beyond the core tricks in SKILL.md.

---

## Table of Contents

1. [Git Internals & Object Model](#git-internals--object-model)
2. [History Surgery with filter-repo](#history-surgery-with-filter-repo)
3. [Commit & Tag Signing](#commit--tag-signing)
4. [Git LFS](#git-lfs)
5. [Monorepo Strategies](#monorepo-strategies)
6. [Advanced Merge Strategies](#advanced-merge-strategies)
7. [Git Notes](#git-notes)
8. [Shallow Clone Workflows for CI/CD](#shallow-clone-workflows-for-cicd)
9. [Multi-Remote Workflows](#multi-remote-workflows)
10. [Advanced Submodule Management](#advanced-submodule-management)
11. [Custom Git Commands](#custom-git-commands)
12. [Rebase Strategies for Complex Histories](#rebase-strategies-for-complex-histories)

---

## Git Internals & Object Model

Git is a content-addressable filesystem. Every object is identified by its SHA-1 hash.

### Four Object Types

| Type | Purpose | Inspect |
|------|---------|---------|
| **blob** | File content (no filename) | `git cat-file -p <sha>` |
| **tree** | Directory listing (blobs + subtrees) | `git ls-tree <sha>` |
| **commit** | Snapshot pointer + metadata + parent(s) | `git cat-file -p <sha>` |
| **tag** | Named pointer to a commit (annotated) | `git cat-file -p <tag-sha>` |

### Inspecting Internals

```bash
# Hash an object without storing it
echo "Hello" | git hash-object --stdin

# Store a blob manually
echo "Hello" | git hash-object -w --stdin

# Read a tree (directory snapshot)
git ls-tree HEAD

# Show raw commit object
git cat-file -p HEAD

# Count objects and pack stats
git count-objects -vH

# Verify integrity
git fsck --full

# Show all refs (branches, tags, stashes)
git for-each-ref --format='%(refname:short) %(objecttype) %(objectname:short)'
```

### Packfiles & Garbage Collection

```bash
# Manually pack loose objects
git gc

# Aggressive GC (recompresses everything)
git gc --aggressive --prune=now

# Repack for optimal performance
git repack -a -d --depth=250 --window=250

# Prune unreachable objects immediately
git prune --expire=now

# Show pack statistics
git verify-pack -v .git/objects/pack/*.idx | sort -k3 -n | tail -20
```

### The Reflog in Depth

```bash
# Show reflog for HEAD
git reflog

# Show reflog for a specific branch
git reflog show feature/my-branch

# Reflog with timestamps
git reflog --date=iso

# Expire reflog entries older than 30 days
git reflog expire --expire=30.days --all

# Find a lost commit by searching reflog
git reflog | grep "keyword"
git log -g --grep="keyword"
```

---

## History Surgery with filter-repo

`git filter-repo` is the modern replacement for `git filter-branch` (which is deprecated). Install separately: `pip install git-filter-repo`.

### Common Operations

```bash
# Remove a file from entire history
git filter-repo --path secrets.json --invert-paths

# Remove a directory from entire history
git filter-repo --path build/ --invert-paths

# Keep only a subdirectory (extract to standalone repo)
git filter-repo --subdirectory-filter src/my-service/

# Rename a directory throughout history
git filter-repo --path-rename old-name/:new-name/

# Replace text in all files throughout history (e.g., remove passwords)
git filter-repo --replace-text expressions.txt
# expressions.txt format:
# literal:old-password==>REDACTED
# regex:secret_key\s*=\s*"[^"]*"==>secret_key = "REDACTED"

# Change author info throughout history
git filter-repo --mailmap mailmap.txt
# mailmap.txt format:
# New Name <new@email.com> <old@email.com>

# Remove files larger than a threshold
git filter-repo --strip-blobs-bigger-than 10M

# Analyze repo for large files before cleaning
git filter-repo --analyze
# Check .git/filter-repo/analysis/ for reports
```

### Safety Notes

- Always work on a fresh clone: `git clone --mirror repo.git cleaned-repo.git`
- `filter-repo` refuses to run on a repo with remotes (use `--force` if sure)
- After filtering, all SHAs change -- coordinate with team before force-pushing
- Teammates must re-clone (not pull) after a history rewrite

---

## Commit & Tag Signing

### GPG Signing

```bash
# Configure GPG key
git config --global user.signingkey <key-id>
git config --global commit.gpgsign true
git config --global tag.gpgsign true

# Sign a single commit
git commit -S -m "Signed commit"

# Sign a tag
git tag -s v1.0.0 -m "Signed release"

# Verify a commit signature
git verify-commit <sha>
git log --show-signature

# Verify a tag signature
git verify-tag v1.0.0
```

### SSH Signing (Git 2.34+)

```bash
# Configure SSH signing
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true

# Set allowed signers for verification
echo "user@email.com ssh-ed25519 AAAA..." > ~/.config/git/allowed_signers
git config --global gpg.ssh.allowedSignersFile ~/.config/git/allowed_signers

# Verify
git verify-commit HEAD
```

---

## Git LFS

Git Large File Storage replaces large files with text pointers while storing the actual content on a remote server.

### Setup & Migration

```bash
# Install (platform-dependent, then per-repo)
git lfs install

# Track file patterns
git lfs track "*.psd"
git lfs track "*.zip"
git lfs track "assets/**"

# Check .gitattributes was updated
cat .gitattributes

# Migrate existing large files into LFS
git lfs migrate import --include="*.psd" --everything

# Check LFS status
git lfs ls-files
git lfs status

# Fetch LFS objects
git lfs pull

# Push LFS objects
git lfs push --all origin
```

### LFS Troubleshooting

```bash
# Verify LFS is correctly configured
git lfs env

# Check which files are tracked
git lfs track

# Prune old LFS objects
git lfs prune

# Fetch missing LFS objects
git lfs fetch --all
```

---

## Monorepo Strategies

### Sparse Checkout (Git 2.25+)

```bash
# Initialize sparse checkout in cone mode
git sparse-checkout init --cone

# Check out only specific top-level directories
git sparse-checkout set src/service-a src/shared tests/service-a

# Add more directories later
git sparse-checkout add docs/

# List current sparse patterns
git sparse-checkout list

# Disable sparse checkout
git sparse-checkout disable
```

### CODEOWNERS

```
# .github/CODEOWNERS
# Global owner
*                          @team-lead

# Service-specific owners
/src/service-a/            @team-a
/src/service-b/            @team-b
/src/shared/               @platform-team

# File-type owners
*.sql                      @dba-team
*.proto                    @api-team
```

### Monorepo Performance Tuning

```bash
# Enable filesystem monitor
git config core.fsmonitor true
git config core.untrackedcache true

# Commit graph for faster traversal
git commit-graph write --reachable --changed-paths

# Scheduled background maintenance
git maintenance start
# This registers tasks: gc, commit-graph, prefetch, loose-objects, incremental-repack

# Check maintenance config
git config --get-regexp maintenance
```

---

## Advanced Merge Strategies

### Custom Merge Drivers

```ini
# .gitattributes
package-lock.json merge=ours
yarn.lock merge=ours
*.generated.cs merge=union
```

```bash
# Register a custom merge driver
git config merge.ours.driver true
# "true" means always keep our version

# Custom merge driver with script
git config merge.custom.driver "custom-merge-tool %O %A %B %L %P"
git config merge.custom.name "Custom merge for special files"
```

### Octopus Merge (Multiple Branches at Once)

```bash
# Merge multiple branches simultaneously
git merge feature-1 feature-2 feature-3 --no-edit
```

### Merge Without Fast-Forward (Explicit Merge Commit)

```bash
# Always create a merge commit (useful for documenting feature integration)
git merge --no-ff feature/my-feature
```

### Ours vs Theirs During Conflicts

```bash
# Accept all of ours for a specific file during merge
git checkout --ours path/to/conflicted-file
git add path/to/conflicted-file

# Accept all of theirs
git checkout --theirs path/to/conflicted-file
git add path/to/conflicted-file

# During rebase (ours/theirs are swapped!):
# "ours" = branch being rebased onto
# "theirs" = your commits being replayed
```

---

## Git Notes

Attach metadata to commits without modifying history.

```bash
# Add a note to a commit
git notes add -m "Reviewed by: Alice" <sha>

# Show notes
git log --show-notes

# Push notes to remote
git push origin refs/notes/commits

# Fetch notes from remote
git fetch origin refs/notes/commits:refs/notes/commits

# Notes in different namespaces
git notes --ref=review add -m "Approved" <sha>
git log --show-notes=review
```

---

## Shallow Clone Workflows for CI/CD

```bash
# Shallow clone for CI (fastest)
git clone --depth=1 <url>

# Shallow clone with enough history for merge-base detection
git clone --depth=50 <url>

# Deepen a shallow clone when needed
git fetch --deepen=100
git fetch --unshallow   # get full history

# Partial clone (download blobs on demand)
git clone --filter=blob:none <url>            # no blobs initially
git clone --filter=tree:0 <url>               # no trees initially
git clone --filter=blob:limit=1m <url>        # skip blobs > 1MB

# Treeless clone (best for CI -- has all commits, fetches trees on demand)
git clone --filter=tree:0 <url>
```

---

## Multi-Remote Workflows

### Fork + Upstream Pattern

```bash
# After forking, add upstream
git remote add upstream https://github.com/original/repo.git

# Sync fork with upstream
git fetch upstream
git rebase upstream/main

# Push to your fork
git push origin main

# List all remotes
git remote -v

# Rename a remote
git remote rename origin fork

# Set upstream tracking
git branch --set-upstream-to=upstream/main main
```

### Multiple Push Targets

```bash
# Push to multiple remotes at once
git remote set-url --add --push origin git@github.com:user/repo.git
git remote set-url --add --push origin git@gitlab.com:user/repo.git

# Now `git push origin` pushes to both
```

---

## Advanced Submodule Management

```bash
# Add a submodule
git submodule add https://github.com/lib/lib.git libs/lib

# Clone a repo with submodules
git clone --recurse-submodules <url>

# Update all submodules to latest commit on their tracking branch
git submodule update --remote --merge

# Run a command in every submodule
git submodule foreach 'git checkout main && git pull'

# Remove a submodule
git submodule deinit libs/lib
git rm libs/lib
rm -rf .git/modules/libs/lib

# Convert submodule to subtree
git submodule deinit libs/lib
git rm libs/lib
git subtree add --prefix=libs/lib https://github.com/lib/lib.git main --squash
```

---

## Custom Git Commands

Any executable named `git-<name>` on PATH becomes a git command.

```bash
# Create a custom command: git recent
# Save as ~/bin/git-recent (make executable)
#!/bin/bash
git for-each-ref --sort=-committerdate refs/heads/ \
  --format='%(committerdate:relative)%09%(refname:short)%09%(subject)' \
  | head -${1:-10}

# Usage:
git recent      # show 10 most recent branches
git recent 20   # show 20
```

```bash
# Create: git pr-checkout (checkout a GitHub PR locally)
# Save as ~/bin/git-pr-checkout
#!/bin/bash
git fetch origin pull/$1/head:pr-$1
git switch pr-$1
```

---

## Rebase Strategies for Complex Histories

### Rebase onto (Branch Transplant)

```bash
# Move feature branch from old-base to new-base
#
# Before:         After:
# A-B-C (main)    A-B-C (main)
#    \                 \
#     D-E (old-base)    F'-G' (feature)
#      \
#       F-G (feature)

git rebase --onto main old-base feature
```

### Interactive Rebase Operations

| Command | Effect |
|---------|--------|
| `pick` | Keep commit as-is |
| `reword` | Keep commit, edit message |
| `edit` | Pause at commit (split, amend) |
| `squash` | Meld into previous commit, combine messages |
| `fixup` | Meld into previous commit, discard message |
| `drop` | Remove commit entirely |
| `exec` | Run a shell command after the previous commit |
| `break` | Pause rebase (for inspection) |

### Splitting a Commit

```bash
git rebase -i HEAD~3
# Mark the target commit as "edit"

# When rebase pauses at that commit:
git reset HEAD~1                    # undo commit, keep changes
git add file1.cs && git commit -m "Part 1"
git add file2.cs && git commit -m "Part 2"
git rebase --continue
```

### Exec for Batch Operations

```bash
# Verify every commit compiles
git rebase -i main --exec "dotnet build"

# Update author on last 5 commits
git rebase -i HEAD~5 --exec 'git commit --amend --author="Name <email>" --no-edit'
```
