#ifndef OKLAB_H
#define OKLAB_H
#include <stdint.h>
#include <math.h>
// Represents a color in the OKLab color space.
typedef struct {
    double l; // Lightness
    double a; // Green-Red axis
    double b; // Blue-Yellow axis
} oklab;
// Represents a color in linear sRGB space (0.0 to 1.0).
typedef struct {
    double r;
    double g;
    double b;
} linear_srgb;
// Represents a color in standard sRGB space (0-255).
typedef struct {
    uint8_t r;
    uint8_t g;
    uint8_t b;
} srgb_u8;
/**
 * @brief Converts a color from the sRGB color space to the OKLab color space.
 * @param rgb The input color in 8-bit sRGB.
 * @return The converted color in OKLab.
 */
oklab srgb_to_oklab(srgb_u8 rgb);
/**
 * @brief Converts a color from the OKLab color space to the sRGB color space.
 * @param c The input color in OKLab.
 * @return The converted color in 8-bit sRGB. Gamut clipping is applied.
 */
srgb_u8 oklab_to_srgb(oklab c);
/**
 * @brief Calculates the perceptual distance (Delta E 2000) between two OKLab colors.
 * @param c1 The first OKLab color.
 * @param c2 The second OKLab color.
 * @return The calculated distance.
 */
double delta_e_ok(oklab c1, oklab c2);
/**
 * @brief Linearly interpolates between two OKLab colors.
 * @param c1 The starting color.
 * @param c2 The ending color.
 * @param t The interpolation factor (0.0 to 1.0).
 * @return The interpolated OKLab color.
 */
oklab lerp_oklab(oklab c1, oklab c2, double t);
#endif // OKLAB_H