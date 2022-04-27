---
title: Build a Toy Browser with NodeJS
date: 2022-04-27 20:45:44
tags: browser
---
## Before Starting

That's right, I dig another hole to myself. I saw [this](https://browser.engineering/) interesting book called Web Browser Engineering, which teach to build a browser with python. Since I'm learning SICPJS now, and I will build a compiler at the end of the course, thinking that this two course may have some connections. I read the catalog of the book, and yes, this book mainly focus on core features of browser: rendering, networking, parsing DOM, and so on. But it seems avoid digging into the js engine part, instead it use `eval()` to parse js code. So I think it's a good idea to combine two of them.
What's more, I decide to implement the broswer using NodeJS, rather than python. Here is the reason: 
1. It is a good chance to practice and learn NodeJS's API.
2. NodeJS have a native support for JavaScript, which make our toy-broswer even more fast.
3. NodeJS has an awesome community which you can find almost every module you need.
4. I'm so in love with JavaScript because of its rapidly evolution, and powerful expression ability like first-class function.

But why the original book don't implement with JavaScript or other language? The author acutally gave [the reason](https://browser.engineering/blog/why-python.html) in the blog. Basically, javascript will have a lot of tech problems like how to make eval don't affect other pages, and it is quite tricky to handle multi-process massaging model in JavaScript. What's more, network in broswer at restrict.
But I will try to implement it in NodeJS, which support [TLS](https://nodejs.org/api/tls.html) and Canvas and some other neccessary modules. It should not have too much trouble by using the language since NodeJS have so many modules that are ready to use. Anyway, let's try it and overcome challenges as far as possible!

## Reference

[Web Browser Engineering](https://browser.engineering/)
[How Browsers Work: Behind the scenes of modern web browsers](https://www.html5rocks.com/en/tutorials/internals/howbrowserswork/)
[Structure and Interpretation of Computer Programs, JS Edtion](https://sourceacademy.org/sicpjs/)