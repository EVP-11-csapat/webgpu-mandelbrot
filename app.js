const canvas = document.querySelector("canvas");
canvas.width = window.innerWidth
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
    centerX : -0.5,
    centerY : 0,
    span : 5,
    aspect : canvas.height / canvas.width
}

const params = new Float32Array([
    canvas.width, canvas.height,
    jsParams.centerX - (.5 * jsParams.span), 0, jsParams.centerY - (.5 * jsParams.span * jsParams.aspect), 0, jsParams.span, 0,  jsParams.span * jsParams.aspect, 0,
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

function split64(a) {

    const high = Math.fround(a)
    const low = a - high

    return { low: low, high: high };
}

function updateBuffer(){
    const newLeft = split64(jsParams.centerX - (.5 * jsParams.span))
    params[2] = newLeft.high
    params[3] = newLeft.low

    const newTop = split64(jsParams.centerY - (.5 * jsParams.span * jsParams.aspect))
    params[4] = newTop.high
    params[5] = newTop.low

    const hSpan = split64(jsParams.span)
    params[6] = hSpan.high
    params[7] = hSpan.low

    const vSpan = split64(jsParams.span * jsParams.aspect)
    params[8] = vSpan.high
    params[9] = vSpan.low
}

window.addEventListener('keydown', (event) => {
    switch (event.code) {
        case "KeyA":
            jsParams.centerX -= jsParams.span * 0.02
            break;
        case "KeyD":
            jsParams.centerX += jsParams.span * 0.02
            break;
        case "KeyW":
            jsParams.centerY -= jsParams.span * 0.02
            break;
        case "KeyS":
            jsParams.centerY += jsParams.span * 0.02
            break;
        case "KeyE":
            jsParams.span = jsParams.span * 0.97;
            break;
        case "KeyQ":
            jsParams.span = jsParams.span * 1.03;
            break;
        case "ArrowUp":
            params[10] = params[10] * 1.1;
            break;
        case "ArrowDown":
            params[10] = params[10] * 0.9;
            break;
    }

    updateBuffer();
})

window.addEventListener("click", (e)=>{
    const mouseX = (e.clientX / canvas.width - 0.5) * jsParams.span
    const mouseY =( e.clientY / canvas.height - 0.5) * jsParams.span * jsParams.aspect

    jsParams.centerX += mouseX
    jsParams.centerY += mouseY

    updateBuffer();
})

window.addEventListener("resize", (event) => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    params[0] = canvas.width
    params[1] = canvas.height

    jsParams.aspect = canvas.height / canvas.width

    updateBuffer();
});

const framerateElem = document.getElementById("framerate");
const frameTimeElem = document.getElementById("frametime");

let prevTime = performance.now();

const render = async (time) => {
    const frameTime = time - prevTime;
    frameTimeElem.innerHTML = frameTime.toFixed(0).toLocaleString("FR");
    const framerate = 1000 / frameTime;
    framerateElem.innerHTML = framerate.toFixed(0);
    prevTime = time;
   
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
    
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);

    pass.setPipeline(cellPipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setBindGroup(0, bindGroup);

    device.queue.writeBuffer(uniformBuffer, 0, params)

    pass.draw(vertices.length / 2);
    pass.end();
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    requestAnimationFrame(render);
};

requestAnimationFrame(render);