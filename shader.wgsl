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

override one: f32 = 1.0;

struct fp64 {
	high: f32,
	low: f32,
}

// Divide float number to high and low floats to extend fraction bits
fn split64(a: f32) -> fp64 {
	let c = (f32(1u << 12u) + 1.0) * a;
	let a_big = c - a;
	let a_hi = c * one - a_big;
	let a_lo = a * one - a_hi;
	return fp64(a_hi, a_lo);
}

// Special sum operation when a > b
fn quickTwoSum(a: f32, b: f32) -> fp64 {
	let x = (a + b) * one;
	let b_virt = (x - a) * one;
	let y = b - b_virt;
	return fp64(x, y);
}

fn twoSum(a: f32, b: f32) -> fp64 {
	let x = (a + b);
	let b_virt = (x - a) * one;
	let a_virt = (x - b_virt) * one;
	let b_err = b - b_virt;
	let a_err = a - a_virt;
	let y = a_err + b_err;
	return fp64(x, y);
}

fn twoSub(a: f32, b: f32) -> fp64 {
	let s = (a - b);
	let v = (s * one - a) * one;
	let err = (a - (s - v) * one) * one - (b + v);
	return fp64(s, err);
}

fn twoProd(a: f32, b: f32) -> fp64 {
	let x = a * b;
	let a2 = split64(a);
	let b2 = split64(b);
	let err1 = x - (a2.high * b2.high * one) * one;
	let err2 = err1 - (a2.low * b2.high * one) * one;
	let err3 = err2 - (a2.high * b2.low * one) * one;
	let y = a2.low * b2.low - err3;
	return fp64(x, y);
}

fn sum64(a: fp64, b: fp64) -> fp64 {
	var s = twoSum(a.high, b.high);
	var t = twoSum(a.low, b.low);
	s.low += t.high;
	s = quickTwoSum(s.high, s.low);
	s.low += t.low;
	s = quickTwoSum(s.high, s.low);
	return s;
}

fn sub64(a: fp64, b: fp64) -> fp64 {
	var s = twoSub(a.high, b.high);
	var t = twoSub(a.low, b.low);
	s.low += t.high;
	s = quickTwoSum(s.high, s.low);
	s.low += t.low;
	s = quickTwoSum(s.high, s.low);
	return fp64(s.high, s.low);
}

fn mul64(a: fp64, b: fp64) -> fp64 {
	var p = twoProd(a.high, b.high);
	p.low += a.high * b.low;
	p.low += a.low * b.high;
	p = quickTwoSum(p.high, p.low);
	return p;
}
