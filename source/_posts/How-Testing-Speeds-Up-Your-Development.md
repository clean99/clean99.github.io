---
title: How Testing Speeds Up Your Development
date: 2022-08-18 17:19:01
tags: testing
---

As frontend developers, most of us don't like to write testing because "it will slow down development". I didn't write tests before and I can feel your pain about writing tests for a "fast-changing" frontend project. But I do want to tell you that in most cases testing can speed up your development instead of slow it down. Unless you are writing the wrong tests. I have an article to show you {% post_link Some-Common-Mistakes-in-React-Testing %} that cause you to feel pain during your development. And in this article, I want to show you **why the right tests can speed up your development.**

## What is development?
We are developers and we develop software every day. But really, what is development? What do we actually do in our daily work?<br />In _working effectively with legacy code_, the author thinks that development is all about behavior changes. There are four types of the development process:

1.  Adding a feature 
1.  Fixing a bug 
1.  Improving the design 
1.  Optimizing resource usage

Each of them requires a different kind of behavior changes:<img alt="development type" src="/img/testing/developmenttype.png">As you can see, We want to add a new behavior in the software when we add a new feature, and we want to change the old behavior when we fix a bug. But when we are optimizing or refactoring, we usually don't want our behavior to change. If we make some unexpected changes in our software behavior, we call it **regression**.

### Software rot
Most of us have the experience that fixing bugs or adding a new feature in a legacy project(a big project without well code structure and testing) is more painful and harder than doing a new project from zero to one. This is because **software gets rot day by day** when we keep adding new features to it. The code will become very complex and eventually very hard to maintain. Luckily we have React / Vue frame that **modulizes** our website to pages, and pages to components. So it usually won't become very complex in every component, but it will be at some kind of the point. Even the team with the best code quality can't prevent software from getting rot, because **decoupling doesn't mean that you don't add any couple at all**.

### Maintaining is getting harder and harder
So, when the behaviors are getting more and more complex, we will find it even harder to do development while making sure that the existing behavior doesn't change. When we add behavior in a component, the state, or the dom structure will change. How to guarantee that the **existing behavior is preserved**? How to guarantee that the **new behavior doing what we expected**? And, how to guarantee our **new behavior can work well with our existing behavior**?<br />**Testing can give you confidence.**
<img alt="preserving behavior" src="/img/testing/preservingbehavior.png">

## The role of testing
Tests can play two roles in development. One is for validation, another is for preventing regression. Those two kind of testing can help you develop with **confidence** and **speed up** in the different development lifecycle.

### Validation testing
When we add new behavior to our program, we want to know that the new behavior act as we want, how? Most frontend developers will write code and then go to the local dev env to check the behavior changing. This is called manual testing. So what's wrong with this kind of testing? Why automatic testing can be much more effective than manual testing? Here is an example:<br />You developed a small component that appears after a bunch of steps. Let's say we want to develop a message box that will show after submitting a form that needs to fill 20 fields. <br />So if you use manual testing:

- You need to **type in 20 fields(click, click, type......)** just like your users and then click submit. 
- You need to **pray that the server(both your localhost server and backend) won't break** while you are testing.
- You need to **pray that the dependencies(In this example, the Form component) work correctly**.
- You need to **pray that the whole process can work correctly at one time**. If it doesn't, guess what? You need to debug the components related to this whole process, including but not limited to, Form component, API, and Message box.
- Your colleague reviews your code and wants you to change some of the code, you need to do the click type cycle again with considerate test cases. It's just awful!

As you can see manual testing is all about praying(just kidding). It will become even more awful when there are more dependencies and the component itself is more complex.<br />What about automatic testing? <br />You can just write **a couple of lines of test** to validate that this message box will show the correct message with the corresponding response status code. And then you can write a test with some **mock** field data to test it can submit to backend with expected data and format.<br />I can promise you that you will spend much less time writing those tests and running them(within several seconds for typically frontend tests) than you click click and type and submit in local dev. What's more, you can know which part is broken if your test failed. Instead of debugging the whole system. And your testing can run **thousands of times**, the is a significant benefit of automated testing.<br />**It's all about isolation.** Tests help you to isolate every component, so you can gain **fast, precise feedback** every time you change code. With just a couple more codes to write.

### Regression testing
The validation testing is all about validating our new behavior, while the regression testing is for **ensuring the old behavior won't change as we modify our code**.<br />You just join a new team and your boss doesn't really like you, he gives some tickets to fix bugs and add new features to a "legacy" project. When you first look into the project's codebase, you got stock by the mass structure and it doesn't have any test and document! So you have to do a lot of research (by running the project's features one by one) to check what this project can do, and which part is broken.<br />After several days, you have the courage to modify the code, you fix a bug by changing some of the state hooks. But guess what, you still **have a high risk to introduce new bugs** because you don't know what this state hook is for.<br />So if the project has written tests before, what you need to do is just to check its test cases, because **the test cases can serve as documentation**, you can know what the project(components) will do in the specific situation. And if you modify the code, you can have the **confidence** to say that **you didn't break the important features** after you run all of the tests. So now the tests are **serviced as regression testing to prevent regression**.<br />It will be lucky if you are handling a project that has tests. And for the project without any test, you can still add by yourself to **cover that behavior around the code that you want to modify**.

## Other benefits
There are some other benefits that automatic testing can give you, here are some of them:

- **Documentation**: Tests can serve as documentation of your project because it simulates how user interact with the project and how the project react.
- **Force you to understand your requirement**: If you don't know what your requirements are, you can't write tests, because tests are basically a translation from human word to script. And if you are using {% post_link Testing-Best-Practice-Tdd %}, **you need to write tests first according to your requirements**, that will be even better to force you to think about requirements first.
- **Force you to decouple your code in a good structure**: If your code is coupled and all of the stuff is written in a single component, you are hard to write tests for it since you can't isolate them anymore. So tests can help you to consider whether that code **structure and design are appropriate**.
