---
title: How I Use ChatGPT in My Daily Work&Study?
date: 2023-02-22 13:47:51
tags:
---

## 1. Background

ChatGPT has garnered significant attention since its release and has become a popular tool for many professionals. While it's been widely discussed, it's important to explore how ChatGPT can benefit us in our day-to-day work. In this article, I will be sharing some of the practical applications of ChatGPT that I have found to be particularly useful.

## 2. Ways to Use It

### 2.1 Coding

### 2.1.2 Generate Code

ChatGPT can generate code for you. With the modularity technique, you can generate a large system with ChatGPT very quickly. Refer to my previous post: {% post_link Use-Modular-Design-with-ChatGPT-to-Generate-Code %}

### 2.1.2 Explain Code

It can explain your code super clearly. One tip is that you should provide the context as much as possible or the bot will guess what a function is for according to the function name and parameter, which may lead to low accuracy.
Here is a random code snippet I picked from my textbook.


<img alt="chatgpt" src="/img/chatgpt/chatgpt-17.png">

### 2.1.3 Write Test Cases / Storybook(and Much More Things) for Me

I have to say chatGPT is an expert at testing and storybooks use case writing, I rarely need to change what it gives me. Let's look at an example:

#### 2.1.3.1 Unit testing

<img alt="chatgpt" src="/img/chatgpt/chatgpt-18.png">

```tsx
import { render, screen } from '@testing-library/react';
import MessageBubble from './MessageBubble';

describe('<MessageBubble />', () => {
  const text = 'Hello, world!';
  const direction = 'left';
  const imgUrl = 'https://via.placeholder.com/50';
  const username = 'Alice';

  it('should render the message text, avatar, and username', () => {
    render(
      <MessageBubble
        text={text}
        direction={direction}
        imgUrl={imgUrl}
        username={username}
      />
    );

    const messageText = screen.getByText(text);
    const avatarImg = screen.getByAltText(`${username}'s avatar`);
    const usernameText = screen.getByText(username);

    expect(messageText).toBeInTheDocument();
    expect(avatarImg).toHaveAttribute('src', imgUrl);
    expect(usernameText).toBeInTheDocument();
  });

  it('should display the message bubble in the correct direction', () => {
    render(
      <MessageBubble
        text={text}
        direction={direction}
        imgUrl={imgUrl}
        username={username}
      />
    );

    const messageBubble = screen.getByTestId('message-bubble');

    if (direction === 'left') {
      expect(messageBubble).toHaveClass('left');
    } else if (direction === 'right') {
      expect(messageBubble).toHaveClass('right');
    }
  });
});
```

#### 2.1.3.2 Storybook

<img alt="chatgpt" src="/img/chatgpt/chatgpt-19.png">

```tsx
import React from 'react';
import { Story, Meta } from '@storybook/react';
import MessageBubble, { MessageBubbleProps } from './MessageBubble';

export default {
  title: 'MessageBubble',
  component: MessageBubble,
} as Meta;

const Template: Story<MessageBubbleProps> = (args) => <MessageBubble {...args} />;

export const LeftBubble = Template.bind({});
LeftBubble.args = {
  text: 'Hello, world!',
  direction: 'left',
  imgUrl: 'https://via.placeholder.com/50',
  username: 'Alice',
};

export const RightBubble = Template.bind({});
RightBubble.args = {
  text: 'Hi there!',
  direction: 'right',
  imgUrl: 'https://via.placeholder.com/50',
  username: 'Bob',
};
```

## 2.2 Documentation

ChatGPT also good at handling documentation. Here are some use cases:

### 2.2.1 Document optimization

- Paragraph before optimization:

> Backgroud: ChatGPT has become famous after publishing. Everyone is using chatGPT, everyone is talking about chatGPT. But how does it help us in our daily work? Today I want to share some of the use cases of chatGPT I found very useful.

- Paragraph after optimization:

> Backgroud: ChatGPT has garnered significant attention since its release and has become a popular tool for many professionals. While it's been widely discussed, it's important to explore how ChatGPT can benefit us in our day-to-day work. In this article, I will be sharing some of the practical applications of ChatGPT that I have found to be particularly useful.

### 2.2.2 Extend Your Ideas

Give chatGPT this text:
> Profit model:
> 1. Membership: charging members monthly to get profit.
> 2. Ads: use google ads to make a profit.
> 3. Donation: add a "buy me a coffce page" for people to donate.
> Help me to extend the profit model.
After extension:
>  1. Premium Features: Offer advanced or exclusive features that can only be accessed through a paid subscription or one-time payment. This can include more in-depth analysis, personalized recommendations, or access to a larger database of information.
> 2. Affiliate Marketing: Partner with other companies and earn commission on products or services sold through referral links. This can be a great way to earn additional revenue while also promoting products that align with your audience's interests.
> .....

### 2.2.3 Summary

Tell chatGPT to summarize the above paragraph:
The paragraph discusses different ways to monetize a platform or niche. Premium features can be offered for a fee, affiliate marketing involves earning commission on products or services sold through referral links, sponsorship involves partnering with relevant brands to create paid content, consulting allows the offering of expert advice for a fee, e-commerce involves selling products related to the platform or niche, and licensing allows for the monetization of content or data by other organizations.
Feel free to summarize longer text, like a book.

## 2.3 Design

### 2.3.1 What should I use?(Dependency Selection)

Show chatGPT about your requirements. ChatGPT will help you to find tools.
I gonna create a social network app, the load is on query user's relationship, and I want the database design to be more simple, what database should I use?
Here is the answer:
If you're looking for a simpler database design and your main focus is on querying user relationships, a graph database may be a good fit for your social network app.
Graph databases like Neo4j or Amazon Neptune are designed specifically for handling complex relationships between data points, making them a good fit for social network apps where users are connected through various relationships. In a graph database, relationships are first-class citizens and the data model is centered around nodes (representing entities) and edges (representing relationships between nodes). This can make querying and analyzing relationships more intuitive and efficient.
In addition, graph databases are optimized for traversing relationships, which can make them faster for certain types of queries than traditional relational databases. They are also designed to scale horizontally, so they can handle large amounts of data and traffic.
Overall, a graph database could be a good choice if your focus is on user relationships and you want a simpler data model. However, it's important to carefully evaluate your specific requirements and consult with a database expert or development team to determine the best option for your app.

## 2.4 Learning

### 2.4.1 Plan My Study(Roadmap Generation)

Q: 
> I want to become a frontend developer, what topics should I learn?

A:
> If you want to become a frontend developer, you should start by learning the following topics:
> 1. HTML: Hypertext Markup Language is the foundation of every website, and it is used to structure and organize content.
> 2. CSS: Cascading Style Sheets is used to style and design websites, making them visually appealing and responsive.
> 3. JavaScript: A programming language that is used to add interactivity, dynamic behavior, and functionality to websites.
> 4. User Experience (UX): UX design is about creating an intuitive and easy-to-use website that provides a positive experience for the user.
> .....
### 2.4.2 Suggest Free Resources for Learning something
Q: 
> I want to learn reactjs as a beginner, what free resources do you recommend me to study?

A:
> There are many free resources available for learning ReactJS as a beginner. Here are some of the best free resources that I would recommend:
> 1. Official ReactJS Documentation: The official ReactJS website provides extensive documentation and tutorials that cover everything from the basics to advanced topics.
> 2. ReactJS Tutorial by Codecademy: Codecademy offers a free interactive tutorial that covers the basics of ReactJS and helps you build your first React app.
> 3. ReactJS Crash Course by Traversy Media: This free YouTube video tutorial is a great introduction to ReactJS and covers the basics of creating components and handling state.
> 4. ReactJS Fundamentals by Egghead: Egghead is a platform that offers free and paid courses on various programming topics, including ReactJS. The ReactJS Fundamentals course is a great resource for beginners, covering topics like JSX, props, and state.
> ......

### 2.4.3 Am I Getting It Right?

One of the biggest pains for self-learning is there isn't a teacher to tell you if you are learning, understanding in the right way. ChatGPT can serve as a teacher to tell you if you are doing right.

#### 2.4.3.1 Mock exam

Q:
> mock an exam for reactjs, 10 questions

A:
> Sure, here's a mock exam with 10 questions to test your knowledge of ReactJS:
> 1. What is JSX, and how does it differ from regular JavaScript syntax?
> 2. What is a component in ReactJS, and how do you define and use components?
> 3. What is the purpose of the "props" object in React, and how do you pass data from a parent component to a child component?
> 4. What is the difference between state and props in React, and when would you use one over the other?
> 5. What is the virtual DOM in React, and how does it improve performance in web applications?
> ......

#### 2.4.3.2 Mock Interview

Me:
> Could you mock a tiktok 2-1 frontend tech interview for me?

ChatGPT:
> Sure, I can conduct a mock interview for a TikTok 2-1 frontend tech position. Here's the first question:
Question: What is your experience with React.js, and how have you used it in previous projects?

Me:
> I have 3 years of experience with ReactJS, I used it in my side project and work.

ChatGPT:
> Great! Can you tell me about a specific feature you implemented using React.js in one of your previous projects? What challenges did you face while implementing it and how did you overcome them?
> ......

## 3. Summary

ChatGPT can help us to write code, explain code, write test cases and documentation and even serve as a teacher through mock exams and interviews. It can do much more in the future since it is become stronger everyday. The key to using ChatGPT effectively is to break down big problems into smaller ones and provide clear context for the AI model. Overall, ChatGPT can be a powerful tool for optimizing workflows and improving productivity. I would like to see more use cases about it.