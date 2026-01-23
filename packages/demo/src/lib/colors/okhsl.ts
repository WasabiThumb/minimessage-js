
export interface OkHSL {
    toRGB(h: number, s: number, l: number): { r: number, g: number, b: number };
    fromRGB(r: number, g: number, b: number): { h: number, s: number, l: number };
}

export const OkHSL: OkHSL = (() => {
    // https://bottosson.github.io/misc/ok_color.h
    const FLT_MAX = 3.4028234663852886e+38;
    type Lab = { L: number, a: number, b: number };
    type RGB = { r: number, g: number, b: number };
    type HSL = { h: number, s: number, l: number };
    type LC = { L: number, C: number };
    type ST = { S: number, T: number };
    type Cs = { C_0: number, C_mid: number, C_max: number };

    function Lab(L: number, a: number, b: number): Lab {
        return { L, a, b };
    }

    function RGB(r: number, g: number, b: number): RGB {
        return { r, g, b };
    }

    function HSL(h: number, s: number, l: number): HSL {
        return { h, s, l };
    }

    function LC(L: number, C: number): LC {
        return { L, C };
    }

    function ST(S: number, T: number): ST {
        return { S, T };
    }

    function Cs(C_0: number, C_mid: number, C_max: number): Cs {
        return { C_0, C_mid, C_max };
    }

    //

    function clamp(x: number, min: number, max: number): number {
        if (isNaN(x)) x = 0;
        if (x < min) return min;
        if (x > max) return max;
        return x;
    }

    function cbrtf(x: number): number {
        return Math.cbrt(x);
    }

    function srgb_transfer_function(a: number): number {
        return 0.0031308 >= a ? 12.92 * a : 1.055 * Math.pow(a, 0.4166666666666667) - .055;
    }

    function srgb_transfer_function_inv(a: number): number {
        return 0.04045 < a ? Math.pow((a + 0.055) / 1.055, 2.4) : a / 12.92;
    }

    function linear_srgb_to_oklab(c: RGB): Lab {
        const l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
        const m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
        const s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;

        const l_ = cbrtf(l);
        const m_ = cbrtf(m);
        const s_ = cbrtf(s);

        return Lab(
            0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
            1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
            0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
        );
    }

    function oklab_to_linear_srgb(c: Lab): RGB {
        const l_ = c.L + 0.3963377774 * c.a + 0.2158037573 * c.b;
        const m_ = c.L - 0.1055613458 * c.a - 0.0638541728 * c.b;
        const s_ = c.L - 0.0894841775 * c.a - 1.2914855480 * c.b;

        const l = l_ * l_ * l_;
        const m = m_ * m_ * m_;
        const s = s_ * s_ * s_;

        return RGB(
             4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
            -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
        );
    }

    function compute_max_saturation(a: number, b: number): number {
        let k0: number, k1: number, k2: number, k3: number,
            k4: number, wl: number, wm: number, ws: number;

        if (-1.88170328 * a - 0.80936493 * b > 1) {
            k0 =  1.19086277;
            k1 =  1.76576728;
            k2 =  0.59662641;
            k3 =  0.75515197;
            k4 =  0.56771245;
            wl =  4.0767416621;
            wm = -3.3077115913;
            ws =  0.2309699292;
        } else if (1.81444104 * a - 1.19445276 * b > 1) {
            k0 =  0.73956515;
            k1 = -0.45954404;
            k2 =  0.08285427;
            k3 =  0.12541070;
            k4 =  0.14503204;
            wl = -1.2684380046;
            wm =  2.6097574011;
            ws = -0.3413193965;
        } else {
            k0 =  1.35733652;
            k1 = -0.00915799;
            k2 = -1.15130210;
            k3 = -0.50559606;
            k4 =  0.00692167;
            wl = -0.0041960863;
            wm = -0.7034186147;
            ws =  1.7076147010;
        }

        let S = k0 + k1 * a + k2 * b + k3 * a * a + k4 * a * b;
        const k_l =  0.3963377774 * a + 0.2158037573 * b;
        const k_m = -0.1055613458 * a - 0.0638541728 * b;
        const k_s = -0.0894841775 * a - 1.2914855480 * b;

        {
            const l_ = 1 + S * k_l;
            const m_ = 1 + S * k_m;
            const s_ = 1 + S * k_s;

            const l = l_ * l_ * l_;
            const m = m_ * m_ * m_;
            const s = s_ * s_ * s_;

            const l_dS = 3 * k_l * l_ * l_;
            const m_dS = 3 * k_m * m_ * m_;
            const s_dS = 3 * k_s * s_ * s_;

            const l_dS2 = 6 * k_l * k_l * l_;
            const m_dS2 = 6 * k_m * k_m * m_;
            const s_dS2 = 6 * k_s * k_s * s_;

            const f = wl * l + wm * m + ws * s;
            const f1 = wl * l_dS + wm * m_dS + ws * s_dS;
            const f2 = wl * l_dS2 + wm * m_dS2 + ws * s_dS2;

            S = S - f * f1 / (f1 * f1 - 0.5 * f * f2);
        }

        return S;
    }

    function find_cusp(a: number, b: number): LC {
        const S_cusp = compute_max_saturation(a, b);
        const rgb_at_max = oklab_to_linear_srgb(Lab(1, S_cusp * a, S_cusp * b));
        const L_cusp = cbrtf(1 / Math.max(rgb_at_max.r, rgb_at_max.g, rgb_at_max.b));
        const C_cusp = L_cusp * S_cusp;
        return LC(L_cusp, C_cusp);
    }

    function find_gamut_intersection(a: number, b: number, L1: number, C1: number, L0: number, cusp?: LC) {
        if (!cusp) cusp = find_cusp(a, b);
        let t: number;
        if (((L1 - L0) * cusp.C - (cusp.L - L0) * C1) <= 0) {
            t = cusp.C * L0 / (C1 * cusp.L + cusp.C * (L0 - L1));
        } else {
            t = cusp.C * (L0 - 1) / (C1 * (cusp.L - 1) + cusp.C * (L0 - L1));
            const dL = L1 - L0;
            const dC = C1;
            const k_l = +0.3963377774 * a + 0.2158037573 * b;
            const k_m = -0.1055613458 * a - 0.0638541728 * b;
            const k_s = -0.0894841775 * a - 1.2914855480 * b;
            const l_dt = dL + dC * k_l;
            const m_dt = dL + dC * k_m;
            const s_dt = dL + dC * k_s;
            const L = L0 * (1 - t) + t * L1;
            const C = t * C1;
            const l_ = L + C * k_l;
            const m_ = L + C * k_m;
            const s_ = L + C * k_s;
            const l = l_ * l_ * l_;
            const m = m_ * m_ * m_;
            const s = s_ * s_ * s_;
            const ldt = 3 * l_dt * l_ * l_;
            const mdt = 3 * m_dt * m_ * m_;
            const sdt = 3 * s_dt * s_ * s_;
            const ldt2 = 6 * l_dt * l_dt * l_;
            const mdt2 = 6 * m_dt * m_dt * m_;
            const sdt2 = 6 * s_dt * s_dt * s_;
            const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s - 1;
            const r1 = 4.0767416621 * ldt - 3.3077115913 * mdt + 0.2309699292 * sdt;
            const r2 = 4.0767416621 * ldt2 - 3.3077115913 * mdt2 + 0.2309699292 * sdt2;
            const u_r = r1 / (r1 * r1 - 0.5 * r * r2);
            let   t_r = -r * u_r;
            const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s - 1;
            const g1 = -1.2684380046 * ldt + 2.6097574011 * mdt - 0.3413193965 * sdt;
            const g2 = -1.2684380046 * ldt2 + 2.6097574011 * mdt2 - 0.3413193965 * sdt2;
            const u_g = g1 / (g1 * g1 - 0.5 * g * g2);
            let   t_g = -g * u_g;
            const bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s - 1;
            const b1 = -0.0041960863 * ldt - 0.7034186147 * mdt + 1.7076147010 * sdt;
            const b2 = -0.0041960863 * ldt2 - 0.7034186147 * mdt2 + 1.7076147010 * sdt2;
            const u_b = b1 / (b1 * b1 - 0.5 * bb * b2);
            let   t_b = -bb * u_b;
            t_r = u_r >= 0 ? t_r : FLT_MAX;
            t_g = u_g >= 0 ? t_g : FLT_MAX;
            t_b = u_b >= 0 ? t_b : FLT_MAX;
            t += Math.min(t_r, t_g, t_b);
        }
        return t;
    }

    function toe(x: number): number {
        const k_1 = 0.206;
        const k_2 = 0.03;
        const k_3 = (1 + k_1) / (1 + k_2);
        return 0.5 * (k_3 * x - k_1 + Math.sqrt((k_3 * x - k_1) * (k_3 * x - k_1) + 4 * k_2 * k_3 * x));
    }

    function toe_inv(x: number): number {
        const k_1 = 0.206;
        const k_2 = 0.03;
        const k_3 = (1 + k_1) / (1 + k_2);
        return (x * x + k_1 * x) / (k_3 * (x + k_2));
    }

    function to_ST(cusp: LC): ST {
        const { L, C } = cusp;
        return ST(C / L, C / (1 - L));
    }

    function get_ST_mid(a_: number, b_: number): ST {
        const S = 0.11516993 + 1 / (+7.44778970 + 4.15901240 * b_ + a_ * (-2.19557347 + 1.75198401 * b_ + a_ * (-2.13704948 - 10.02301043 * b_ + a_ * (-4.24894561 + 5.38770819 * b_ + 4.69891013 * a_))));
        const T = 0.11239642 + 1. / (+1.61320320 - 0.68124379 * b_ + a_ * (+0.40370612 + 0.90148123 * b_ + a_ * (-0.27087943 + 0.61223990 * b_ + a_ * (+0.00299215 - 0.45399568 * b_ - 0.14661872 * a_))));
        return ST(S, T);
    }

    function get_Cs(L: number, a_: number, b_: number): Cs {
        const cusp = find_cusp(a_, b_);
        const C_max = find_gamut_intersection(a_, b_, L, 1, L, cusp);
        const ST_max = to_ST(cusp);
        const k = C_max / Math.min(L * ST_max.S, (1 - L) * ST_max.T);

        let C_mid: number;
        {
            const ST_mid = get_ST_mid(a_, b_);
            const C_a = L * ST_mid.S;
            const C_b = (1 - L) * ST_mid.T;
            C_mid = 0.9 * k * Math.sqrt(Math.sqrt(1 / (1 / (C_a * C_a * C_a * C_a) + 1 / (C_b * C_b * C_b * C_b))));
        }

        let C_0: number;
        {
            const C_a = L * 0.4;
            const C_b = (1 - L) * 0.8;
            C_0 = Math.sqrt(1 / (1 / (C_a * C_a) + 1 / (C_b * C_b)));
        }

        return Cs(C_0, C_mid, C_max);
    }

    function okhsl_to_srgb(hsl: HSL): RGB {
        const { h, s, l } = hsl;
        if (l === 1) return RGB(1, 1, 1);
        if (l === 0) return RGB(0, 0, 0);

        const h_ = Math.PI * 2 * h;
        const a_ = Math.cos(h_);
        const b_ = Math.sin(h_);
        const L = toe_inv(l);

        const Cs = get_Cs(L, a_, b_);
        const { C_0, C_mid, C_max } = Cs;

        const mid = 0.8;
        const mid_inv = 1.25;

        let C: number,
            t: number,
            k_0: number,
            k_1: number,
            k_2: number;

        if (s < mid) {
            t = mid_inv * s;

            k_1 = mid * C_0;
            k_2 = (1 - k_1 / C_mid);

            C = t * k_1 / (1 - k_2 * t);
        } else {
            t = (s - mid) / (1 - mid);

            k_0 = C_mid;
            k_1 = (1 - mid) * C_mid * C_mid * mid_inv * mid_inv / C_0;
            k_2 = (1 - (k_1) / (C_max - C_mid));

            C = k_0 + t * k_1 / (1 - k_2 * t);
        }

        const rgb = oklab_to_linear_srgb(Lab(L, C * a_, C * b_));
        return RGB(
            srgb_transfer_function(rgb.r),
            srgb_transfer_function(rgb.g),
            srgb_transfer_function(rgb.b)
        );
    }

    function srgb_to_okhsl(rgb: RGB): HSL {
        const lab = linear_srgb_to_oklab(RGB(
            srgb_transfer_function_inv(rgb.r),
            srgb_transfer_function_inv(rgb.g),
            srgb_transfer_function_inv(rgb.b)
        ));

        const C = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
        const a_ = lab.a / C;
        const b_ = lab.b / C;

        const L = lab.L;
        const h = 0.5 + 0.5 * Math.atan2(-lab.b, -lab.a) / Math.PI;

        const Cs = get_Cs(L, a_, b_);
        const { C_0, C_mid, C_max } = Cs;

        const mid = 0.8;
        const mid_inv = 1.25;

        let s: number;
        if (C < C_mid) {
            const k_1 = mid * C_0;
            const k_2 = (1 - k_1 / C_mid);

            const t = C / (k_1 + k_2 * C);
            s = t * mid;
        } else {
            const k_0 = C_mid;
            const k_1 = (1 - mid) * C_mid * C_mid * mid_inv * mid_inv / C_0;
            const k_2 = (1 - (k_1) / (C_max - C_mid));

            const t = (C - k_0) / (k_1 + k_2 * (C - k_0));
            s = mid + (1 - mid) * t;
        }

        const l = toe(L);
        return HSL(h, s, l);
    }

    //

    const ret: OkHSL = {
        toRGB(h: number, s: number, l: number): RGB {
            let { r, g, b } = okhsl_to_srgb(HSL(h, s, l));
            r = clamp(Math.round(r * 255), 0, 255);
            g = clamp(Math.round(g * 255), 0, 255);
            b = clamp(Math.round(b * 255), 0, 255);
            return RGB(r, g, b);
        },
        fromRGB(r: number, g: number, b: number): HSL {
            if (r === 255 && g === 255 && b === 255) return HSL(0, 0, 1);
            let { h, s, l } = srgb_to_okhsl(RGB(r / 255, g / 255, b / 255));
            h = clamp(h, 0, 1);
            s = clamp(s, 0, 1);
            l = clamp(l, 0, 1);
            return HSL(h, s, l);
        }
    };
    return Object.freeze(ret);
})();
