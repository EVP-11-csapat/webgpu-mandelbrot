struct Params{
    canvasWidth : f32,
    canvasHeight : f32,
    left : f32,
    top : f32,
    span : f32,
    colorStep : f32
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
    var color : f32 = 0;
    while((z.x * z.x + z.y * z.y) < 4 && color < 1){
        var temp = z.x * z.x - z.y * z.y + c.x;
        z.y = 2.0 * z.x * z.y + c.y;
        z.x = temp;
        color += params.colorStep;
    }

    return vec4f(color, color * 16, color * 32, 1);
}