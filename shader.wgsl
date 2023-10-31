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
    var posX : fp64 = sum64(mul64(twoProd(pixelPosition.x, 1.0 / params.canvasWidth), split64(params.span)), split64(params.left));
    var posY : fp64 = sum64(mul64(twoProd(pixelPosition.y, 1.0 / params.canvasHeight), split64(params.span)), split64(params.top));

    var cX : fp64 = posX;
    var cY : fp64 = posY;

    var zX = cX;
    var zY = cY;
    var iters : i32 = 0;
    while(sub64(sum64(mul64(zX, zX), mul64(zY, zY)), split64(4.0)).high < 0.0 && iters < i32(params.maxIterations)){
        var temp : fp64 = sum64(sub64(mul64(zX, zX), mul64(zY, zY)), cX);
        zY = sum64(mul64(split64(2.0), mul64(zX, zY)), cY);
        zX = temp;
        iters += 1;
    }

    var red : f32 = f32(iters % 64) / 32.0;
    var green : f32 = f32(iters % 96) / 64.0;
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
