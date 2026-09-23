---
title: SICPJS 第二章：用数据构建抽象
date: 2022-05-02 11:40:54
tags: sicpjs
lang: zh
i18n_key: SICPJS-2-Building-Abstractions-with-Data
permalink: zh/2022/05/02/SICPJS-2-Building-Abstractions-with-Data/
---

## 词汇表

## 问题

## 笔记

- 复合数据（Compound data）：就像复合函数一样，我们增强了语言的表达能力，并提升了设计程序时所处的概念层次。
- 将数据粘合在一起（Glue data together）：复合数据将数据粘合在一起，从而降低系统的复杂度。
- 数据抽象（Data abstraction）：模块化数据能够将处理数据的代码部分与处理数据如何被表示的部分分离开来。

```javascript
// repesent, and deal with rational number
// if don't have compound data

const a_numerator = 1
const a_denominator = 4

const b_numerator = 1
const b_denominator = 5

// there's no way you can handle these two rational number without care
// about how they be repesented.

// compound data

const a = {
  numerator: 1,
  denominator: 4
}

const b = {
  numerator: 1,
  denominator: 5
}

function add(a, b){
  return {
    numerator: a.numerator + b.numerator,
    denominator: a.denominator + b.denominator
  }
}

function add_and_multi(a, b){
  return multi(a, add(a, b))
}

// we don't need to care about how a, b repesent data,
// we just abstract how add() and multi() process a, b
```

# 2.1 数据抽象简介

## 词汇表

- 数据抽象（Data abstraction）：与函数抽象相比，数据抽象隐藏了如何组合数据的细节，只暴露"是什么"。

## 问题

## 笔记

- 数据抽象的基本思想是：以这样的方式构建使用复合数据对象的程序，使其在"抽象数据"上进行操作。也就是说，我们的程序应该以一种**不对数据做任何非执行当前任务所必需假设**的方式使用数据。

# 2.1.1 示例：有理数的算术运算

## 词汇表

## 问题

## 笔记

- 一厢情愿（Wishful thinking）：假设我们已经拥有某些尚未实现的东西，然后在此基础上继续构建。
- 抽象有理数算术运算的步骤：
   - 我们基于数据抽象进行操作，所以先隐藏数据抽象的细节（一厢情愿）。
   - 我们假设可以构造一个有理数，并能提取它的分子和分母。

```javascript
function make_rati(n, d) // make rational number which equal n / d
function numer(r) // extract rational number's numerator
function denom(r) // extract rational number's denominator
```

```javascript
function add(a, b) {
  return make_rati((numer(a) * denom(b) + numer(b) * denom(a)) / denom(a) * denom(b))
}
// ...
```

   - 使用序对来实现假设的函数 make_rati、numer、denom。

```javascript
function pair(head, tail) // construct a pair with head and tail
function head(pair) // return pair's head
function tail(pair) // return pair's tail

function make_rati(n, d) {
  const m = gcd(n, d)
  return pair(n / m, d / m)
}

function numer(rati) {
  return head(rati)
}

function denom(rati) {
  return tail(rati)
}
```

- 练习 2.1

```javascript
// handle positive and negative, we only change make_rati
// since it is the only function that modify/create pair
function make_rati(n, d) {
  const m = gcd(n, d)
  if(n * d > 0) {
    return pair(n / m, d / m)
  } else if(n * d < 0) {
    if(n < 0) {
      return pair(n / m, d / m)
    } else {
      return pair(n / m, -d / m)
    }
  }
  // 'd is zero needs handle'
}

// if don't use * to judge, can make some helper function
function make_rati(n, d) {
  const m = gcd(n, d)
  // abstract n and d, only use the sign to compute
  // think about is it necessary to use n and d directly
  // or we can extract the essence to compute
  function sign(x) {
    return x < 0
           ? -1
           : x > 0
           ? 1
           : 0
  }
  function abs(x) {
     return x < 0
            ? -x
            : x;
  }
  return pair(sign(n) * sign(d) * abs(n / m), abs(d / m))
}
```

# 2.1.2 抽象屏障

## 词汇表

## 问题

## 笔记

- 总体而言，数据抽象的基本思想是：为每种类型的数据对象确定一组基本操作，所有该类型数据对象的操作都通过这些基本操作来表达，然后在操作数据时只使用这些操作。

<img alt="Abstraction Barriers" src="/img/sicpjs/abstractionbarriers.png">

水平线表示_抽象屏障_，将系统的不同"层次"隔离开来。这些屏障隐藏了其下方的实现细节。所有复杂数据都可以通过某种方式用原始数据来表示。如何表示数据会影响操作它的程序。但如果只修改实现层，不会影响构建在其上的程序。数据抽象方法使我们能够推迟这一决定，同时不失去在系统其他部分取得进展的能力。（例如，前端无需等待后端 API 完成，只要给出 API 文档（接口），前端就可以开始开发。）

- 练习 2.2

```javascript
// from top to bottom, using data-abstraction barriers to construct the system
// for calculate midpoint of segment, we need make_segment
// and extract start_segment and end_segement
// use interface to abstract
interface segment {
  make_segment: (start, end) => segment
  start_segment: (segment) => point
  end_segment: (segment) => point
}
function midpoint_segment(segment) {
  return avg_point(start_segment, end_segment)
}

function make_segment(start, end) {
  return pair(start, end)
}
function start_segment(segment) {
  return head(segment)
}
function end_segment(segment) {
  return tail(segment)
}

interface point {
  make_point: (x, y) => point
  x_point: (point) => a
  y_point: (point) => b
  avg_point: (start, end) => point
}

function make_point(x, y) {
  return pair(x, y)
}
function x_point(point) {
  return head(point)
}
function y_point(point) {
  return tail(point)
}
// avg use point abstraction
function avg_point(start, end) {
  return make_point((x_point(start) + x_point(end)) / 2, (y_point(start) + y_point(end)) / 2)
}
```

- 练习 2.3

```javascript
interface {
  distence_segment: (a, b) => distence
}

function make_rectange(a, b, c, d) {
  const a_b = pair(a, b)
  const c_d = pair(c, d)
  return pair(a_b, c_d)
}
function a_rectange(r) {
  return head(head(r))
}
// ...
function get_w_and_h(r) {
  const a_to_b = distence_segment(a_rectange(r), b_rectange(r))
  const a_to_c = distence_segment(a_rectange(r), c_rectange(r))
  return pair(a_to_b,a_to_c)
}
function perimeter(r) {
  const w_h = get_w_and_h(r)
  return (head(w_h) + head(w_h)) * 2
}
function area(r) {
 const w_h = get_w_and_h(r)
  return head(w_h) * head(w_h)
}
function get_w_and_h(r) {
  const a_to_b = distence_segment(a_rectange(r), b_rectange(r))
  const a_to_c = distence_segment(a_rectange(r), c_rectange(r))
  return pair(a_to_b,a_to_c)
}
```

# 2.1.3 数据意味着什么？

## 词汇表

- 数据（Data）：由一组选择器和构造器定义，以及这些函数必须满足的特定条件，以构成有效的表示形式。

## 问题

## 笔记

- 只要能遵守规则并实现选择器和构造器，就可以将其用作数据。实现方式并不重要。
- 消息传递（Message passing）：用函数表示数据，通过传递消息来获取特定的返回值。
- 消息传递实现序对

```javascript
// fulfill: z = pair(x, y) head(z) = x tail(z) = y
function pair(x, y) {
  function dispatch(m) {
    return m === 0
           ? x
           : y
  }
  return dispatch
}
function head(z) {
  return z(0)
}
function tail(z) {
  return z(1)
}

// 只要满足规则就可以代表数据，背后是不是真的是一个存储的变量已经不重要了，pair(x, z) 返回（生成）
// 了一个规则可以返回x和y
```

- 练习 2.4

```javascript
function tail(z) {
  return z((x, y) => y)
}
```

- 练习 2.5

```javascript
function pair(a, b) {
  return fast_expt(2, a) + fast_expt(3, b)
}
function head(p) {
  return p % 2 === 0
         ? head(p / 2) + 1
         : 0
}
function tail(p) {
  return p % 3 === 0
         ? tail(p / 3) + 1
         : 0
}
```

- 练习 2.6

```javascript
const zero = f => x => x

function add_1(n) {
  return f => x => f(n(f)(x))
}

// add_1(zero)

const one = f => x => f(x)

const two = f => x => f(f(x))

function plus(p, q) {
  return f => x => (p(f)(q(f)(x)))
}
```

# 2.1.4 扩展练习：区间算术

## 词汇表

## 问题

## 笔记

- 练习 2.7

```javascript
function make_interval(x, y) {
  return pair(x, y)
}
function upper_bound(i) {
  return tail(i)
}
function lower_bound(i) {
  return head(i)
}
```

- 练习 2.8

```javascript
function sub_interval(x, y) {
  return add_interval(x, make_interval(lower_bound(y),upper_bound(y)))
}
```

- 练习 2.9

```javascript
// proof: width A + width B = width C, where C is A + B (interval)
// A + B = C => upper(A) + upper(B) = upper(C), lower(A) + lower(B) = lower(C)
// width A + width B  = (upper(A) - lower(A)) / 2 + (upper(B) - lower(B)) / 2
// = (upper(A) + upper(B) - (lower(A) + lower(B))) / 2 = (upper(C) - lower(C)) / 2
// = C

[1, 2] * [1, 2] = [1, 4]
```

- 练习 2.10

```javascript
function div_interval(x, y) {
  return lower_bound(y) <= 0 && upper_bound(y) >= 0
         ? signal('x can't be zero')
         : mul_interval(x, make_interval(lower(y),upper(y)))
}
```

- 练习 2.11

```javascript
function mul_interval(x, y) {
  if(lower_bound(x) <= 0 && lower_bound(y) <= 0) {
    if(upper_bound(x) >= 0 && upper_bound(y) >= 0) {
      const p1 = upper_bound(x) * upper_bound(y)
      const p2 = lower_bound(x) * lower_bound(y)
      const p3 = upper_bound(x) * lower_bound(y)
      const p4 = upper_bound(y) * lower_bound(x)
      return make_interval(math_min(p1, p2, p3, p4),
                         math_max(p1, p2, p3, p4))
    }
    return make_interval(upper_bound(x) * upper_bound(y),
                         lower_bound(x) * lower_bound(y))
  } else {
    return make_interval(lower_bound(x) * lower_bound(y),
                         upper_bound(x) * upper_bound(y))
  }
}
```

- 练习 2.12

```javascript
function make_center_percent(c, p) {
  return make_interval(c * (1 - p), c * (1 + p))
}
function center(i) {
  return (lower_bound(i) + upper_bound(i)) / 2
}
function percent(i) {
  return ((upper_bound(i) - lower_bound(i)) / 2) / center(i)
}
```

- 练习 2.13

```javascript
// a * b -> pa * pb
function mul_interval(x, y) {
  return make_center_percent(center(x) * center(y), percent(x) * percent(y))
}
```

如果只看两个端点，有些问题会变得更难解决。但如果换个角度来看待数据，反而会变得更容易。
