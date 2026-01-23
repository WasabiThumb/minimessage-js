import texturedVert from './shader/textured.vert?raw';
import sliderFrag from './shader/slider.frag?raw';
import {type AttributeMap, type BufferMap, ShaderRenderer, type UniformMap} from "./shader.ts";
import {Color} from "./color.ts";

//

type Attribute = "aVertexPosition" | "aTextureCoord";
type Uniform = "uHue" | "uSaturation";
type Buffer = "vertexPosition" | "textureCoord";

const RADIUS = 0.25;
const PAD = 0.2;
const PAD_2 = PAD + PAD;
const KNOB_WIDTH = 0.85;
const KNOB_HEIGHT = 0.35;

//

export class LightnessSlider extends ShaderRenderer<Attribute, Uniform, Buffer> {

    private readonly _value: Color;

    constructor(element: HTMLCanvasElement, value: Color) {
        super(
            element,
            1,
            256,
            texturedVert,
            sliderFrag,
            [ "aVertexPosition", "aTextureCoord" ],
            [ "uHue", "uSaturation" ],
            {
                vertexPosition: [
                    -1, -1,
                    -1,  1,
                     1,  1,
                     1, -1
                ],
                textureCoord: [
                    0, 1,
                    0, 0,
                    1, 0,
                    1, 1
                ]
            }
        );
        this._value = value;
        this._bindEvents();
    }

    //

    protected spin(
        ctx: CanvasRenderingContext2D,
        surface: OffscreenCanvas,
        gl: WebGLRenderingContext
    ) {
        super.spin(ctx, surface, gl);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
    }

    protected renderSurface(
        _surface: OffscreenCanvas,
        gl: WebGLRenderingContext,
        program: WebGLProgram,
        attributes: AttributeMap<Attribute>,
        uniforms: UniformMap<Uniform>,
        buffers: BufferMap<Buffer>
    ) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(program);

        gl.enableVertexAttribArray(attributes.aVertexPosition);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertexPosition);
        gl.vertexAttribPointer(attributes.aVertexPosition, 2, gl.FLOAT, false, 0, 0);

        gl.enableVertexAttribArray(attributes.aTextureCoord);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
        gl.vertexAttribPointer(attributes.aTextureCoord, 2, gl.FLOAT, false, 0, 0);

        const hsl = this._value.get("okhsl");
        gl.uniform1f(uniforms.uHue, hsl.h);
        gl.uniform1f(uniforms.uSaturation, hsl.s);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    }

    protected renderElement(
        ctx: CanvasRenderingContext2D,
        surface: OffscreenCanvas
    ) {
        const { width, height } = this.element;
        const h = height / width;
        ctx.setTransform(width, 0, 0, width, 0, 0);
        ctx.clearRect(0, 0, 1, h);

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(PAD, PAD, 1 - PAD_2, h - PAD_2, RADIUS);
        ctx.clip();
        ctx.drawImage(surface, PAD, PAD, 1 - PAD_2, h - PAD_2);
        ctx.restore();

        // Draw knob
        const hsl = this._value.get("okhsl");
        const rgb = this._value.get("rgb");

        const cx = 0.5;
        const cy = PAD + ((h - PAD_2) * hsl.l);

        const part = ((w: number, h: number, color: string) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(
                cx - (w / 2),
                cy - (h / 2),
                w,
                h,
                RADIUS
            );
            ctx.fill();
        });

        part(KNOB_WIDTH, KNOB_HEIGHT, `#fff`);
        part(KNOB_WIDTH - 0.05, KNOB_HEIGHT - 0.05, `#000`);
        part(KNOB_WIDTH - 0.10, KNOB_HEIGHT - 0.10, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
    }

    private _onPointer(_x: number, y: number): void {
       const rect = this.element.getBoundingClientRect();
       const pad = rect.width * PAD;
       const top = rect.top + pad;
       const bottom = rect.bottom - pad;

       let l: number;
       if (y <= top) {
           l = 0;
       } else if (y >= bottom) {
           l = 1;
       } else {
           l = (y - top) / (bottom - top);
       }

       const current = this._value.get("okhsl");
       this._value.set("okhsl", {
           h: current.h,
           s: current.s,
           l
       });
    }

    private _bindEvents() {
        const { element } = this;
        let capturedPointer: number = -1;

        element.addEventListener("pointerdown", (e) => {
            if (e.pointerType === "mouse" && 0 !== e.button) return;
            const id = e.pointerId;
            if (capturedPointer === -1) {
                capturedPointer = id;
                element.setPointerCapture(id);
                this._onPointer(e.clientX, e.clientY);
            }
        });
        element.addEventListener("pointermove", (e) => {
            if (e.pointerId === capturedPointer) {
                this._onPointer(e.clientX, e.clientY);
            }
        });
        element.addEventListener("pointerup", (e) => {
            if (e.pointerId === capturedPointer) {
                element.releasePointerCapture(capturedPointer);
                capturedPointer = -1;
            }
        });
    }

}
