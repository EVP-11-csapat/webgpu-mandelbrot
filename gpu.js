const canvas = document.querySelector("canvas");
canvas.width = window.innerHeight
canvas.height = window.innerHeight

if (!navigator.gpu) {
    throw new Error("WebGPU not supported on this browser.");
}
const adapter = await navigator.gpu.requestAdapter();
if (!adapter) {
    throw new Error("No appropriate GPUAdapter found.");
}

async function loadShader() {
    let shaderCode = await fetch('shader.wgsl');
    return await shaderCode.text()
}

const device = await adapter.requestDevice();
const context = canvas.getContext("webgpu");
const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
    device: device,
    format: canvasFormat,
});

const vertices = new Float32Array([
    -1, 1,
    1, 1,
    -1, -1,

    1, 1,
    1, -1,
    -1, -1
])
const vertexBuffer = device.createBuffer({
    label: "Cell vertices",
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(vertexBuffer, 0, vertices);

const vertexBufferLayout = {
    arrayStride: 8,
    attributes: [{
        format: "float32x2",
        offset: 0,
        shaderLocation: 0,
    }],
};

const jsParams = {
    left: -2.0,
    top: -1.5,
    span: 3.0
}

const params = new Float32Array([
    canvas.width, canvas.height,
    -2.0, 0, -1.5, 0, 3.0, 0,
    255.0
])

const uniformBuffer = device.createBuffer({
    label: "Parameters",
    size: params.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const cellShaderModule = device.createShaderModule({
    label: "Cell shader",
    code: await loadShader()
});

const cellPipeline = device.createRenderPipeline({
    label: "Cell pipeline",
    layout: "auto",
    vertex: {
        module: cellShaderModule,
        entryPoint: "vertexMain",
        buffers: [vertexBufferLayout]
    },
    fragment: {
        module: cellShaderModule,
        entryPoint: "fragmentMain",
        targets: [{
            format: canvasFormat
        }]
    }
});

const bindGroup = device.createBindGroup({
    layout: cellPipeline.getBindGroupLayout(0),
    entries: [
        {binding: 0, resource: {buffer: uniformBuffer}},
    ],
});

device.queue.writeBuffer(uniformBuffer, 0, params)

const renderPassDescriptor = {
    label: 'canvas renderPass',
    colorAttachments: [
        {
            clearValue: [0, 0, 0, 1],
            loadOp: 'clear',
            storeOp: 'store',
        },
    ],
};

function render() {
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);

    pass.setPipeline(cellPipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setBindGroup(0, bindGroup);
    pass.draw(vertices.length / 2);
    pass.end();
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}

function split64(a) {

    const high = Math.fround(a)
    const low = a - high

    return { low: low, high: high };
}

window.addEventListener('keydown', (event) => {
    switch (event.code) {
        case "KeyA":
            jsParams.left -= jsParams.span * 0.02
            break;
        case "KeyD":
            jsParams.left += jsParams.span * 0.02
            break;
        case "KeyW":
            jsParams.top -= jsParams.span * 0.02
            break;
        case "KeyS":
            jsParams.top += jsParams.span * 0.02
            break;
        case "KeyE":
            jsParams.span = jsParams.span * 0.97;
            jsParams.left += jsParams.span * 0.015;
            jsParams.top += jsParams.span * 0.015;
            break;
        case "KeyQ":
            jsParams.span = jsParams.span * 1.03;
            jsParams.left -= jsParams.span * 0.015;
            jsParams.top -= jsParams.span * 0.015;
            break;
        case "ArrowUp":
            params[8] = params[8] * 1.1;
            break;
        case "ArrowDown":
            params[8] = params[8] * 0.9;
            break;
    }

    const newLeft = split64(jsParams.left)
    params[2] = newLeft.high
    params[3] = newLeft.low

    const newTop = split64(jsParams.top)
    params[4] = newTop.high
    params[5] = newTop.low

    const newSpan = split64(jsParams.span)
    params[6] = newSpan.high
    params[7] = newSpan.low

    device.queue.writeBuffer(uniformBuffer, 0, params)
    render()
})

addEventListener("resize", (event) => {
    canvas.width = window.innerHeight
    canvas.height = window.innerHeight

    params[0] = canvas.width
    params[1] = canvas.height

    device.queue.writeBuffer(uniformBuffer, 0, params)
    render()
});

render();
