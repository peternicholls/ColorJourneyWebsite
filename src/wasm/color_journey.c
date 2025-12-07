#include "oklab.h"
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <math.h>
#include <stdbool.h>
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
    double vibrancy;
    double warmth;
    double bezier_light[2];
    double bezier_chroma[2];
    uint32_t seed;
    int num_colors;
    int num_anchors;
    int loop_mode; // 0: open, 1: closed, 2: ping-pong
    int variation_mode; // 0: off, 1: subtle, 2: noticeable
    bool enable_color_circle;
    double arc_length;
    char curve_style[16];
    int curve_dimensions; // bitflags: 1=L, 2=C, 4=H, 8=all
    double curve_strength;
} CJ_Config;
typedef struct {
    oklab ok;
    srgb_u8 rgb;
} CJ_ColorPoint;
// --- Helper Functions ---
static uint32_t rng_state;
void seed_rng(uint32_t seed) { rng_state = seed == 0 ? 1 : seed; }
uint32_t xorshift32() {
    uint32_t x = rng_state;
    x ^= x << 13; x ^= x >> 17; x ^= x << 5;
    return rng_state = x;
}
double random_double() { return (double)xorshift32() / UINT32_MAX; }
double get_easing(const char* style, double t, double p1, double p2) {
    if (strcmp(style, "ease-in") == 0) return cubic_bezier(t, 0.42, 0);
    if (strcmp(style, "ease-out") == 0) return cubic_bezier(t, 0, 0.58);
    if (strcmp(style, "sinusoidal") == 0) return 0.5 - 0.5 * cos(t * M_PI);
    if (strcmp(style, "stepped") == 0) return floor(t * 5) / 4.0;
    if (strcmp(style, "custom") == 0) return cubic_bezier(t, p1, p2);
    return t; // linear
}
// --- Core API ---
EXPORT
CJ_ColorPoint* generate_discrete_palette(CJ_Config* config, oklab* anchors) {
    if (config->num_colors <= 0 || config->num_anchors <= 0) return NULL;
    CJ_ColorPoint* palette = (CJ_ColorPoint*)malloc(sizeof(CJ_ColorPoint) * config->num_colors);
    if (!palette) return NULL;
    seed_rng(config->seed);
    for (int i = 0; i < config->num_colors; ++i) {
        double t = (config->loop_mode == 1) ? ((double)i / config->num_colors) : ((config->num_colors > 1) ? (double)i / (config->num_colors - 1) : 0.5);
        if (config->loop_mode == 2) { t *= 2.0; if (t > 1.0) t = 2.0 - t; }
        oklab current_ok;
        double local_t = t;
        if (config->num_anchors > 1) {
            int num_segments = (config->loop_mode == 1) ? config->num_anchors : config->num_anchors - 1;
            double segment_t = t * num_segments;
            int segment_idx = fmin(num_segments - 1, floor(segment_t));
            local_t = segment_t - segment_idx;
            current_ok = lerp_oklab(anchors[segment_idx], anchors[(segment_idx + 1) % config->num_anchors], local_t);
        } else {
            current_ok = anchors[0];
        }
        double eased_t = get_easing(config->curve_style, local_t, config->bezier_light[0], config->bezier_light[1]);
        double strength = config->curve_strength;
        bool apply_l = (config->curve_dimensions & 1) || (config->curve_dimensions & 8);
        bool apply_c = (config->curve_dimensions & 2) || (config->curve_dimensions & 8);
        bool apply_h = (config->curve_dimensions & 4) || (config->curve_dimensions & 8);
        double base_chroma = sqrt(current_ok.a * current_ok.a + current_ok.b * current_ok.b);
        double base_hue = atan2(current_ok.b, current_ok.a);
        current_ok.l += (apply_l ? lerp(0, config->lightness * 0.2, eased_t * strength) : config->lightness * 0.2 * local_t);
        double new_chroma = (apply_c ? lerp(base_chroma, base_chroma * config->chroma, eased_t * strength) : lerp(base_chroma, base_chroma * config->chroma, local_t));
        if (config->num_anchors == 1 && config->enable_color_circle) {
            double arc_rad = config->arc_length / 360.0 * 2.0 * M_PI;
            double hue_mod = apply_h ? eased_t * strength : t;
            base_hue += hue_mod * arc_rad + config->warmth * 0.5;
        }
        double boost = 1.0 + config->vibrancy * 0.6 * fmax(0.0, 1.0 - fabs(local_t - 0.5) / 0.35);
        new_chroma *= boost;
        current_ok.a = cos(base_hue) * new_chroma;
        current_ok.b = sin(base_hue) * new_chroma;
        if (config->variation_mode > 0) {
            double var_strength = config->variation_mode == 1 ? 0.01 : 0.03;
            current_ok.l += (random_double() - 0.5) * var_strength * 0.5;
            current_ok.a += (random_double() - 0.5) * var_strength;
            current_ok.b += (random_double() - 0.5) * var_strength;
        }
        palette[i].ok = current_ok;
    }
    // Contrast Enforcement
    double min_contrast = config->contrast * 0.1;
    for (int k = 0; k < 3; ++k) {
        for (int i = 1; i < config->num_colors; ++i) {
            double dE = delta_e_ok(palette[i-1].ok, palette[i].ok);
            if (dE < min_contrast) {
                double nudge = (min_contrast - dE) * 0.5;
                palette[i].ok.l = fmax(0.0, fmin(1.0, palette[i].ok.l + nudge));
            }
        }
    }
    for (int i = 0; i < config->num_colors; ++i) {
        palette[i].rgb = oklab_to_srgb(palette[i].ok);
    }
    return palette;
}
EXPORT
void* wasm_malloc(size_t size) { return malloc(size); }
EXPORT
void wasm_free(void* ptr) { free(ptr); }