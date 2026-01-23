varying mediump vec2 vTextureCoord;

uniform mediump float uLightness;

// Trig

const mediump float TAU = 6.283185307179586;
const mediump float PI = 3.141592653589793;
const mediump float PI_2 = 1.5707963267948966;

mediump float atan2(mediump float y, mediump float x) {
    if (abs(x) > abs(y)) {
        return atan(y,x);
    } else {
        return PI_2 - atan(x,y);
    }
}

// Conversions
// Derived from https://bottosson.github.io/misc/ok_color.h

const mediump float FLT_MAX = 3.4028234663852886e+38;
const mediump float K_1 = 0.206;
const mediump float K_2 = 0.03;
const mediump float K_3 = (1.0 + K_1) / (1.0 + K_2);

mediump float cbrt(mediump float x) {
    return sign(x)*pow(abs(x),1.0/3.0);
}

mediump float toeInv(mediump float x) {
    return (x * x + K_1 * x) / (K_3 * (x + K_2));
}

mediump float srgbTransferFunction(mediump float a) {
    return 0.0031308 >= a ? 12.92 * a : 1.055 * pow(a, 0.4166666666666667) - 0.055;
}

mediump float computeMaxSaturation(mediump float a, mediump float b) {
    mediump float k0, k1, k2, k3, k4, wl, wm, ws;

    if (-1.88170328 * a - 0.80936493 * b > 1.0) {
        // Red component
        k0 =  1.19086277;
        k1 =  1.76576728;
        k2 =  0.59662641;
        k3 =  0.75515197;
        k4 =  0.56771245;
        wl =  4.0767416621;
        wm = -3.3077115913;
        ws =  0.2309699292;
    } else if (1.81444104 * a - 1.19445276 * b > 1.0) {
        // Green component
        k0 =  0.73956515;
        k1 = -0.45954404;
        k2 =  0.08285427;
        k3 =  0.12541070;
        k4 =  0.14503204;
        wl = -1.2684380046;
        wm =  2.6097574011;
        ws = -0.3413193965;
    } else {
        // Blue component
        k0 =  1.35733652;
        k1 = -0.00915799;
        k2 = -1.15130210;
        k3 = -0.50559606;
        k4 =  0.00692167;
        wl = -0.0041960863;
        wm = -0.7034186147;
        ws =  1.7076147010;
    }

    mediump float S = k0 + k1 * a + k2 * b + k3 * a * a + k4 * a * b;
    mediump float k_l =  0.3963377774 * a + 0.2158037573 * b;
    mediump float k_m = -0.1055613458 * a - 0.0638541728 * b;
    mediump float k_s = -0.0894841775 * a - 1.2914855480 * b;

    {
        mediump float l_ = 1.0 + S * k_l;
        mediump float m_ = 1.0 + S * k_m;
        mediump float s_ = 1.0 + S * k_s;

        mediump float l = l_ * l_ * l_;
        mediump float m = m_ * m_ * m_;
        mediump float s = s_ * s_ * s_;

        mediump float l_dS = 3.0 * k_l * l_ * l_;
        mediump float m_dS = 3.0 * k_m * m_ * m_;
        mediump float s_dS = 3.0 * k_s * s_ * s_;

        mediump float l_dS2 = 6.0 * k_l * k_l * l_;
        mediump float m_dS2 = 6.0 * k_m * k_m * m_;
        mediump float s_dS2 = 6.0 * k_s * k_s * s_;

        mediump float f = wl * l + wm * m + ws * s;
        mediump float f1 = wl * l_dS + wm * m_dS + ws * s_dS;
        mediump float f2 = wl * l_dS2 + wm * m_dS2 + ws * s_dS2;

        S = S - f * f1 / (f1 * f1 - 0.5 * f * f2);
    }

    return S;
}

mediump vec3 oklab2linearSrgb(mediump vec3 lab) {
    mediump float l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
    mediump float m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
    mediump float s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;

    mediump float l = l_ * l_ * l_;
    mediump float m = m_ * m_ * m_;
    mediump float s = s_ * s_ * s_;

    return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    );
}

mediump vec2 findCusp(mediump float a, mediump float b) {
    mediump float Scusp = computeMaxSaturation(a, b);
    mediump vec3 rgbAtMax = oklab2linearSrgb(vec3(1, Scusp * a, Scusp * b));
    mediump float Lcusp = cbrt(1.0 / max(max(rgbAtMax.x, rgbAtMax.y), rgbAtMax.z));
    mediump float Ccusp = Lcusp * Scusp;
    return vec2(Lcusp, Ccusp);
}

mediump vec2 toST(mediump vec2 lc) {
    mediump float l = lc.x;
    mediump float c = lc.y;
    return vec2(c / l, c / (1.0 - l));
}

mediump float findGamutIntersection(mediump float a, mediump float b, mediump float L1, mediump float C1, mediump float L0, mediump vec2 cusp) {
    mediump float t;
    if (((L1 - L0) * cusp.y - (cusp.x - L0) * C1) <= 0.0) {
        // lower half
        t = cusp.y * L0 / (C1 * cusp.x + cusp.y * (L0 - L1));
    } else {
        // upper half
        t = cusp.y * (L0 - 1.0) / (C1 * (cusp.x - 1.0) + cusp.y * (L0 - L1));
        {
            mediump float dL = L1 - L0;
            mediump float dC = C1;

            mediump float k_l =  0.3963377774 * a + 0.2158037573 * b;
            mediump float k_m = -0.1055613458 * a - 0.0638541728 * b;
            mediump float k_s = -0.0894841775 * a - 1.2914855480 * b;

            mediump float l_dt = dL + dC * k_l;
            mediump float m_dt = dL + dC * k_m;
            mediump float s_dt = dL + dC * k_s;

            // iterations may be increased
            {
                mediump float L = L0 * (1.0 - t) + t * L1;
                mediump float C = t * C1;

                mediump float l_ = L + C * k_l;
                mediump float m_ = L + C * k_m;
                mediump float s_ = L + C * k_s;

                mediump float l = l_ * l_ * l_;
                mediump float m = m_ * m_ * m_;
                mediump float s = s_ * s_ * s_;

                mediump float ldt = 3.0 * l_dt * l_ * l_;
                mediump float mdt = 3.0 * m_dt * m_ * m_;
                mediump float sdt = 3.0 * s_dt * s_ * s_;

                mediump float ldt2 = 6.0 * l_dt * l_dt * l_;
                mediump float mdt2 = 6.0 * m_dt * m_dt * m_;
                mediump float sdt2 = 6.0 * s_dt * s_dt * s_;

                mediump float r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s - 1.0;
                mediump float r1 = 4.0767416621 * ldt - 3.3077115913 * mdt + 0.2309699292 * sdt;
                mediump float r2 = 4.0767416621 * ldt2 - 3.3077115913 * mdt2 + 0.2309699292 * sdt2;

                mediump float u_r = r1 / (r1 * r1 - 0.5 * r * r2);
                mediump float t_r = -r * u_r;

                mediump float g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s - 1.0;
                mediump float g1 = -1.2684380046 * ldt + 2.6097574011 * mdt - 0.3413193965 * sdt;
                mediump float g2 = -1.2684380046 * ldt2 + 2.6097574011 * mdt2 - 0.3413193965 * sdt2;

                mediump float u_g = g1 / (g1 * g1 - 0.5 * g * g2);
                mediump float t_g = -g * u_g;

                mediump float b = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s - 1.0;
                mediump float b1 = -0.0041960863 * ldt - 0.7034186147 * mdt + 1.7076147010 * sdt;
                mediump float b2 = -0.0041960863 * ldt2 - 0.7034186147 * mdt2 + 1.7076147010 * sdt2;

                mediump float u_b = b1 / (b1 * b1 - 0.5 * b * b2);
                mediump float t_b = -b * u_b;

                t_r = u_r >= 0.0 ? t_r : FLT_MAX;
                t_g = u_g >= 0.0 ? t_g : FLT_MAX;
                t_b = u_b >= 0.0 ? t_b : FLT_MAX;

                t += min(t_r, min(t_g, t_b));
            }
        }
    }
    return t;
}

mediump vec2 getStMid(mediump float a_, mediump float b_) {
    mediump float S = 0.11516993 + 1.0 / (
    +7.44778970 + 4.15901240 * b_
    + a_ * (-2.19557347 + 1.75198401 * b_
    + a_ * (-2.13704948 - 10.02301043 * b_
    + a_ * (-4.24894561 + 5.38770819 * b_ + 4.69891013 * a_
    )))
    );

    mediump float T = 0.11239642 + 1.0 / (
    +1.61320320 - 0.68124379 * b_
    + a_ * (+0.40370612 + 0.90148123 * b_
    + a_ * (-0.27087943 + 0.61223990 * b_
    + a_ * (+0.00299215 - 0.45399568 * b_ - 0.14661872 * a_
    )))
    );

    return vec2(S, T);
}

mediump vec3 getCs(in mediump float L, in mediump float a_, in mediump float b_) {
    mediump vec2 cusp = findCusp(a_, b_);
    mediump float cMax = findGamutIntersection(a_, b_, L, 1.0, L, cusp);
    mediump vec2 stMax = toST(cusp);
    mediump float k = cMax / min((L * stMax.x), (1.0 - L) * stMax.y);

    mediump float cMid;
    {
        mediump vec2 stMid = getStMid(a_, b_);
        mediump float C_a = L * stMid.x;
        mediump float C_b = (1.0 - L) * stMid.y;
        cMid = 0.9 * k * sqrt(sqrt(1.0 / (1.0 / (C_a * C_a * C_a * C_a) + 1.0 / (C_b * C_b * C_b * C_b))));
    }

    mediump float c0;
    {
        mediump float C_a = L * 0.4;
        mediump float C_b = (1.0 - L) * 0.8;
        c0 = sqrt(1.0 / (1.0 / (C_a * C_a) + 1.0 / (C_b * C_b)));
    }

    return vec3(c0, cMid, cMax);
}

mediump vec3 okhsl2srgb(in mediump float hRadians, in mediump float s, in mediump float l) {
    if (l == 1.0) return vec3(1.0, 1.0, 1.0);
    if (l == 0.0) return vec3(0.0, 0.0, 0.0);

    mediump float a_ = cos(hRadians);
    mediump float b_ = sin(hRadians);
    mediump float L = toeInv(l);

    mediump vec3 Cs = getCs(L, a_, b_);
    mediump float C0 = Cs.x;
    mediump float Cmid = Cs.y;
    mediump float Cmax = Cs.z;

    mediump float mid = 0.8;
    mediump float midInv = 1.25;

    mediump float C, t, k_0, k_1, k_2;
    if (s < mid) {
        t = midInv * s;

        k_1 = mid * C0;
        k_2 = (1.0 - k_1 / Cmid);

        C = t * k_1 / (1.0 - k_2 * t);
    } else {
        t = (s - mid)/ (1.0 - mid);

        k_0 = Cmid;
        k_1 = (1.0 - mid) * Cmid * Cmid * midInv * midInv / C0;
        k_2 = (1.0 - (k_1) / (Cmax - Cmid));

        C = k_0 + t * k_1 / (1.0 - k_2 * t);
    }

    mediump vec3 rgb = oklab2linearSrgb(vec3(L, C * a_, C * b_));
    return vec3(
    srgbTransferFunction(rgb.x),
    srgbTransferFunction(rgb.y),
    srgbTransferFunction(rgb.z)
    );
}

// Main

void main() {
    mediump float u = vTextureCoord.x;
    mediump float v = vTextureCoord.y;

    // Get circular coordinates
    mediump float ud = u - 0.5;
    mediump float vd = v - 0.5;
    mediump float magSqr = (ud * ud) + (vd * vd);
    if (magSqr > 0.25) magSqr = 0.25;
    mediump float theta = atan2(vd, ud);

    // Create OkHSL components (H & S)
    mediump float s = sqrt(magSqr) / 0.5;
    mediump float h = (theta < 0.0) ? theta + TAU : theta;

    // Convert to RGB
    mediump vec3 rgb = okhsl2srgb(h, s, uLightness);
    gl_FragColor = vec4(rgb, 1.0);
}
