# Anatomy Image Generation

Generated muscle anatomy illustrations for the soreness tracker.

## Services

| Service | Key Vault Secret | Use Case |
|---------|-----------------|----------|
| OpenAI (`gpt-image-1`) | `openai-api-key` | Base anatomy illustrations (best prompt adherence) |
| Replicate (Flux Dev) | `replicate-api-key` | Stylized variants, img2img, LoRA training (no content filter) |

These API keys are used only for offline image-generation work and are not
consumed by the deployed workout app.

## Image Set Per Muscle Group

Each muscle group needs:

1. **Base image** - the full muscle group in neutral tones on bone
2. **One highlight image per individual muscle** - that muscle in a vivid color, all others muted grey

## Folder Structure

```
deltoids/
  reference/        # Bodyworks Prime accuracy benchmarks (not shipped)
  training/          # LoRA training images
    galactus/        # Galactus character reference images
```

## LoRA Training Plan

Two LoRAs to be trained on Replicate:

### LoRA 1: Anatomy Style
Teaches the model what correct anatomy illustrations look like.
- **Training images**: Generate 10-15 in ChatGPT showing isolated muscles on skeleton
- **Target style**: Clean, Netter/Bodyworks style, single highlighted muscle, white background
- **Status**: Need to generate training set in ChatGPT

### LoRA 2: Galactus Character
Teaches the model what Galactus looks like.
- **Training images**: 6 collected (4 wallpapers + 2 reference images)
- **Location**: `deltoids/training/galactus/`
- **Status**: Ready (could use a few more full-body shots)

### Usage
Stack both LoRAs at generation time on Replicate's Flux Dev. Anatomy LoRA handles the style, Galactus LoRA handles the character. Prompt describes the specific muscle.

## Generation Notes

### Model Comparison

| Model | Pros | Cons |
|-------|------|------|
| `gpt-image-1` (GPT-4o) | Best isolation, follows negative instructions, good anatomy | Content filter blocks copyrighted characters |
| `dall-e-3` | N/A | Poor prompt adherence, ignore exclusions, inconsistent |
| Flux Dev (Replicate) | Sharp output, no content filter, img2img support | Worse isolation, adds rogue muscles, blobby shapes |
| Flux Dev (local/Docker) | Free, uncensored | Too slow on 3080 (17GB model, 10GB VRAM), blurry from CPU offloading |

### Prompting Tips

- "Frank Netter illustration style" produces clean medical textbook plates
- Lateral view hides scapula inner surface, preventing phantom pecs/rotator cuff
- Name specific muscles to exclude AND describe what should be there instead (bare bone)
- Describe the visual result, not just the anatomical name
- "COMPACT and TEARDROP-SHAPED" prevents elongated muscle shapes
- Include full skeleton for scale context, but say "the ONLY muscle" repeatedly
- Use reference images from Bodyworks Prime to verify accuracy

### Best Prompts

**GPT-4o v11 (best overall):**
```
Medical textbook plate of ONLY the deltoid muscle on a skeleton, Frank Netter
illustration style. PURE LATERAL VIEW from the side. Show a full skeleton from
skull to mid-torso in profile. The ONLY muscle on the entire skeleton is the
deltoid, on the outer shoulder. The deltoid is COMPACT and TEARDROP-SHAPED,
covering only the top third of the humerus. It must show visible MUSCLE FIBER
STRIATIONS and THREE HEADS with subtle separation lines: anterior (front,
lighter red), lateral (center, medium red), posterior (rear, darker red). Each
head has different fiber angles. All bones white/light grey. Clean white
background. No labels, no text, no other muscles anywhere.
```

**Replicate v4 (cleanest Flux result):**
```
3D anatomy illustration, lateral view of a human skeleton from the side. White
bones on white background. The deltoid is the ONLY muscle visible, colored in
red. The deltoid sits as a compact rounded cap ON TOP of the outer shoulder
only. It does NOT wrap around to the chest or back. It is shaped like a short
inverted teardrop, wide at the acromion and tapering to the deltoid tuberosity
one-third down the humerus. Show three sections with different red shades
separated by thin lines. No trapezius, no neck muscles, no pectoralis, no
other soft tissue. Only bare skeleton plus one red deltoid muscle. Clean,
clinical, sharp. No text, no labels.
```

## Reference Sources

- [Bodyworks Prime - Deltoid](https://bodyworksprime.com/deltoid/)
- [Wallpaper Cave - Galactus](https://wallpapercave.com/marvel-galactus-wallpapers)
