const canvas = document.querySelector("canvas");

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

const params = new Float32Array([
    canvas.width, canvas.height,
    -2.0, -1.5, 3.0,
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

window.addEventListener('keydown', (event) => {
    switch (event.code) {
        case "KeyA":
            params[2] -= params[4] * 0.02;
            break;
        case "KeyD":
            params[2] += params[4] * 0.02;
            break;
        case "KeyW":
            params[3] -= params[4] * 0.02;
            break;
        case "KeyS":
            params[3] += params[4] * 0.02;
            break;
        case "KeyE":
            let smallerSpan = params[4] * 0.97;
            params[2] += smallerSpan * 0.015;
            params[3] += smallerSpan * 0.015;
            params[4] = smallerSpan;
            break;
        case "KeyQ":
            let largerSpan = params[4] * 1.03;
            params[2] -= largerSpan * 0.015;
            params[3] -= largerSpan * 0.015;
            params[4] = largerSpan;
            break;
        case "ArrowUp":
            params[5] = params[5] * 1.1;
            break;
        case "ArrowDown":
            params[5] = params[5] * 0.9;
            break;
    }
    device.queue.writeBuffer(uniformBuffer, 0, params);
    render();
})

render();
