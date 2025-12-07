#include "oklab.h"
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#define EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define EXPORT
#endif
// --- Data Structures ---
typedef struct {
    double lightness;
    double chroma;
    double contrast;
    uint32_t seed;
    int num_colors;
    int num_anchors;
    int loop_mode; // 0: open, 1: closed, 2: ping-pong
    int variation_mode; // 0: off, 1: subtle, 2: noticeable
} CJ_Config;
typedef struct {
    oklab ok;
    srgb_u8 rgb;
} CJ_ColorPoint;
// --- Helper Functions ---
static uint32_t rng_state;
void seed_rng(uint32_t seed) {
    rng_state = seed == 0 ? 1 : seed;
}
uint32_t xorshift32() {
    uint32_t x = rng_state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    rng_state = x;
    return x;
}
double random_double() {
    return (double)xorshift32() / UINT32_MAX;
}
// --- Core API ---
EXPORT
CJ_ColorPoint* generate_discrete_palette(CJ_Config* config, oklab* anchors) {
    if (config->num_colors <= 0 || config->num_anchors <= 0) {
        return NULL;
    }
    CJ_ColorPoint* palette = (CJ_ColorPoint*)malloc(sizeof(CJ_ColorPoint) * config->num_colors);
    if (!palette) {
        return NULL;
    }
    seed_rng(config->seed);
    for (int i = 0; i < config->num_colors; ++i) {
        double t = 0.5;
        if (config->loop_mode == 1) { // Closed loop
             t = (config->num_colors > 0) ? (double)i / config->num_colors : 0.0;
        } else { // Open or Ping-Pong
             t = (config->num_colors > 1) ? (double)i / (config->num_colors - 1) : 0.5;
        }
        if (config->loop_mode == 2) { // Ping-Pong
            t = t * 2.0;
            if (t > 1.0) t = 2.0 - t;
        }
        oklab current_ok;
        if (config->num_anchors == 1) {
            oklab anchor = anchors[0];
            double hue = atan2(anchor.b, anchor.a);
            double chroma = sqrt(anchor.a * anchor.a + anchor.b * anchor.b);
            double new_hue = hue + t * 2.0 * M_PI;
            current_ok.l = anchor.l;
            current_ok.a = cos(new_hue) * chroma;
            current_ok.b = sin(new_hue) * chroma;
        } else {
            int num_segments = (config->loop_mode == 1) ? config->num_anchors : config->num_anchors - 1;
            double segment_t = t * num_segments;
            int segment_idx = (int)floor(segment_t);
            if (segment_idx >= num_segments) segment_idx = num_segments - 1;
            double local_t = segment_t - segment_idx;
            oklab start_anchor = anchors[segment_idx];
            oklab end_anchor = anchors[(segment_idx + 1) % config->num_anchors];
            current_ok = lerp_oklab(start_anchor, end_anchor, local_t);
        }
        // Apply Dynamics
        current_ok.l += config->lightness * 0.1;
        double current_chroma = sqrt(current_ok.a * current_ok.a + current_ok.b * current_ok.b);
        double current_hue = atan2(current_ok.b, current_ok.a);
        double new_chroma = current_chroma * config->chroma;
        current_ok.a = cos(current_hue) * new_chroma;
        current_ok.b = sin(current_hue) * new_chroma;
        // Apply Variation
        if (config->variation_mode > 0) {
            double strength = config->variation_mode == 1 ? 0.01 : 0.03;
            current_ok.l += (random_double() - 0.5) * strength * 0.5;
            current_ok.a += (random_double() - 0.5) * strength;
            current_ok.b += (random_double() - 0.5) * strength;
        }
        palette[i].ok = current_ok;
        palette[i].rgb = oklab_to_srgb(current_ok);
    }
    // Contrast Enforcement (simple nudge)
    double min_contrast = config->contrast * 0.1;
    for (int k = 0; k < 2; ++k) { // Iterate twice for stability
        for (int i = 1; i < config->num_colors; ++i) {
            double dE = delta_e_ok(palette[i-1].ok, palette[i].ok);
            if (dE < min_contrast) {
                double diff = min_contrast - dE;
                palette[i].ok.l += diff * 0.1; // Nudge lightness
                palette[i].rgb = oklab_to_srgb(palette[i].ok);
            }
        }
    }
    return palette;
}
EXPORT
void* wasm_malloc(size_t size) {
    return malloc(size);
}
EXPORT
void wasm_free(void* ptr) {
    free(ptr);
}