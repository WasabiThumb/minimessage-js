import texturedVert from './shader/textured.vert?raw';
import wheelFrag from './shader/wheel.frag?raw';
import {type AttributeMap, type BufferMap, ShaderRenderer, type UniformMap} from "./shader.ts";
import {Color} from "./color.ts";

//

type Attribute = "aVertexPosition" | "aTextureCoord";
type Uniform = "uLightness";
type Buffer = "vertexPosition" | "textureCoord";

const DIAMETER = 0.9125;

//

export class HueWheel extends ShaderRenderer<Attribute, Uniform, Buffer> {

    private readonly _value: Color;

    constructor(element: HTMLCanvasElement, value: Color) {
        super(
            element,
            128,
            128,
            texturedVert,
            wheelFrag,
            [ "aVertexPosition", "aTextureCoord" ],
            [ "uLightness" ],
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

        gl.uniform1f(uniforms.uLightness, this._value.get("okhsl").l);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    }

    protected renderElement(
        ctx: CanvasRenderingContext2D,
        surface: OffscreenCanvas
    ) {
        const { width, height } = this.element;
        ctx.setTransform(width, 0, 0, height, 0, 0);
        ctx.clearRect(0, 0, 1, 1);

        // Draw the hue circle using the shader
        const r = DIAMETER / 2;
        const pad = 0.5 - r;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0.5, 0.5, r, r, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(surface, pad, pad, DIAMETER, DIAMETER);
        ctx.restore();

        // Draw the cursor
        const hsl = this._value.get("okhsl");
        const rgb = this._value.get("rgb");

        const ang = 2 * Math.PI * hsl.h;
        const cx = 0.5 + r * Math.cos(ang) * hsl.s;
        const cy = 0.5 + r * Math.sin(ang) * hsl.s;

        ctx.fillStyle = `#fff`;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 0.04, 0.04, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `#000`;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 0.035, 0.035, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 0.03, 0.03, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    private _onPointer(x: number, y: number): void {
        const rect = this.element.getBoundingClientRect();
        const mx = rect.left + (rect.width / 2);
        const my = rect.top + (rect.height / 2);
        const d = Math.min(rect.width, rect.height) * DIAMETER;
        const r = d / 2;
        const r2 = r * r;
        const dx = x - mx;
        const dy = y - my;

        const ang = Math.atan2(dy, dx);
        const magSqr = dx * dx + dy * dy;

        const tau = Math.PI * 2;
        const hue = (ang < 0) ?
            ((ang + tau) / tau) :
            (ang / tau);

        const saturation = (magSqr < r2) ?
            (Math.sqrt(magSqr) / r) : 1;

        const current = this._value.get("okhsl");
        this._value.set("okhsl", {
            h: hue,
            s: saturation,
            l: current.l
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
