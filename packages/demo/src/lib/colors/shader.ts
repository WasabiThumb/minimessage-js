
export type AttributeMap<K extends string> = { [k in K]: number };
export type UniformMap<K extends string> = { [k in K]: WebGLUniformLocation };
export type BufferMap<K extends string> = { [k in K]: WebGLBuffer };
type BufferInit<K extends string> = { [k in K]: number[] };

function createShader(
    gl: WebGLRenderingContext,
    source: string,
    type: "VERTEX_SHADER" | "FRAGMENT_SHADER"
): WebGLShader {
    const shader = gl.createShader(gl[type]);
    if (shader === null) throw new Error(`Failed to create shader (${gl.getError()})`);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        throw new Error(`Failed to compile shader`, { cause: info });
    }
    return shader;
}

function createProgram(
    gl: WebGLRenderingContext,
    vertSource: string,
    fragSource: string
): WebGLProgram {
    const vert = createShader(gl, vertSource, "VERTEX_SHADER");
    const frag = createShader(gl, fragSource, "FRAGMENT_SHADER");
    const program = gl.createProgram();
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program);
        throw new Error(`Failed to link shader program`, { cause: info });
    }
    return program;
}

function getAttribLocation(
    gl: WebGLRenderingContext,
    program: WebGLProgram,
    name: string
): GLint {
    const location = gl.getAttribLocation(program, name);
    if (location === -1) throw new Error(`Failed to locate attribute: ${name}`);
    return location;
}

function getUniformLocation(
    gl: WebGLRenderingContext,
    program: WebGLProgram,
    name: string
): WebGLUniformLocation {
    const location = gl.getUniformLocation(program, name);
    if (location === null) throw new Error(`Failed to locate uniform: ${name}`);
    return location;
}

function createArrayBufferFromFloats(
    gl: WebGLRenderingContext,
    floats: number[]
): WebGLBuffer {
    const ret = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ret);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(floats), gl.STATIC_DRAW);
    return ret;
}

//

/**
 * Combines a WebGL surface with a
 * 2D canvas for complex effects
 */
export abstract class ShaderRenderer<
    A extends string,
    U extends string,
    B extends string
> {

    private readonly _ctx: CanvasRenderingContext2D;
    private readonly _surface: OffscreenCanvas;
    private readonly _surfaceCtx: WebGLRenderingContext;
    private readonly _program: WebGLProgram;
    private readonly _attributes: AttributeMap<A>;
    private readonly _uniforms: UniformMap<U>;
    private readonly _buffers: BufferMap<B>;
    private _shouldRender: boolean;
    private _rendering: boolean;

    protected constructor(
        protected element: HTMLCanvasElement,
        surfaceWidth: number,
        surfaceHeight: number,
        vertSrc: string,
        fragSrc: string,
        attributeNames: A[],
        uniformNames: U[],
        bufferInit: BufferInit<B>
    ) {
        const ctx = element.getContext("2d");
        if (ctx === null) throw new Error(`Failed to create 2D context`);

        const surface = new OffscreenCanvas(surfaceWidth, surfaceHeight);
        let surfaceCtx: WebGLRenderingContext | null = surface.getContext("webgl", { });
        if (surfaceCtx === null) throw new Error(`Failed to create WebGL context`);

        this._ctx = ctx;
        this._surface = surface;
        this._surfaceCtx = surfaceCtx;
        this._program = createProgram(surfaceCtx, vertSrc, fragSrc);
        this._attributes = this._buildAttributes(attributeNames);
        this._uniforms = this._buildUniforms(uniformNames);
        this._buffers = this._buildBuffers(bufferInit);
        this._shouldRender = false;
        this._rendering = false;
    }

    //

    get shouldRender(): boolean {
        return this._shouldRender;
    }

    set shouldRender(should: boolean) {
        if (should) this._renderLoop();
        this._shouldRender = should;
    }

    protected spin(
        _ctx: CanvasRenderingContext2D,
        surface: OffscreenCanvas,
        gl: WebGLRenderingContext
    ): void {
        const rect = this.element.getBoundingClientRect();
        this.element.width = rect.width;
        this.element.height = rect.height;
        gl.viewport(0, 0, surface.width, surface.height);
    }

    protected abstract renderSurface(
        surface: OffscreenCanvas,
        gl: WebGLRenderingContext,
        program: WebGLProgram,
        attributes: AttributeMap<A>,
        uniforms: UniformMap<U>,
        buffers: BufferMap<B>
    ): void;

    protected abstract renderElement(
        ctx: CanvasRenderingContext2D,
        surface: OffscreenCanvas
    ): void;

    private _renderLoop(): void {
        if (this._rendering) return;
        this._rendering = true;
        this.spin(this._ctx, this._surface, this._surfaceCtx);

        const frame = (() => {
            try {
                this.renderSurface(
                    this._surface,
                    this._surfaceCtx,
                    this._program,
                    this._attributes,
                    this._uniforms,
                    this._buffers
                );
                this.renderElement(
                    this._ctx,
                    this._surface
                );
            } finally {
                if (this._shouldRender) {
                    window.requestAnimationFrame(frame);
                } else {
                    this._rendering = false;
                }
            }
        });
        window.requestAnimationFrame(frame);
    }

    private _buildAttributes(attributeNames: A[]): AttributeMap<A> {
        const gl = this._surfaceCtx;
        const program = this._program;
        const ret: Record<string, number> = {};
        for (const name of attributeNames) {
            ret[name] = getAttribLocation(gl, program, name);
        }
        return ret as AttributeMap<A>;
    }

    private _buildUniforms(uniformNames: U[]): UniformMap<U> {
        const gl = this._surfaceCtx;
        const program = this._program;
        const ret: Record<string, WebGLUniformLocation> = {};
        for (const name of uniformNames) {
            ret[name] = getUniformLocation(gl, program, name);
        }
        return ret as UniformMap<U>;
    }

    private _buildBuffers(init: BufferInit<B>): BufferMap<B> {
        const gl = this._surfaceCtx;
        const ret: Record<string, WebGLBuffer> = {};
        for (const key of Object.keys(init)) {
            const value = init[key as unknown as B];
            ret[key] = createArrayBufferFromFloats(gl, value);
        }
        return ret as BufferMap<B>;
    }

}
