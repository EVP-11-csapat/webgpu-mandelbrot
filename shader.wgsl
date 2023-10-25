struct Params{
    canvasWidth : f32,
    canvasHeight : f32,
    left : f32,
    top : f32,
    span : f32,
    maxIterations : f32
}

@group(0) @binding(0) var<uniform> params: Params;

@vertex
fn vertexMain(@location(0) pos: vec2f) -> @builtin(position) vec4f {
    return vec4f(pos.x, pos.y, 0, 1);
}

@fragment
fn fragmentMain(@builtin(position) pixelPosition: vec4f) -> @location(0) vec4f {
    var pos : vec2f;
    pos.x = (pixelPosition.x / params.canvasWidth) * params.span + params.left;
    pos.y = (pixelPosition.y / params.canvasHeight) * params.span + params.top;

    var c : vec2f;
    c.x = pos.x;
    c.y = pos.y;

    var z : vec2f;
    z.x = c.x;
    z.y = c.y;
    var iters : i32 = 0;
    while((z.x * z.x + z.y * z.y) < 4 && iters < i32(params.maxIterations)){
        var temp = z.x * z.x - z.y * z.y + c.x;
        z.y = 2.0 * z.x * z.y + c.y;
        z.x = temp;
        iters += 1;
    }

    var red : f32 = f32(iters % 32) / 32.0;
    var green : f32 = f32(iters % 64) / 64.0;
    var blue : f32 = f32(iters % 128) / 128.0;

    if (iters == i32(params.maxIterations)){
        red = 1.0;
        green = 1.0;
        blue = 1.0;
    }

    return vec4f(red, green, blue, 1);
}
