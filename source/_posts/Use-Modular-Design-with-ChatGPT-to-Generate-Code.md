---
title: Use Modular Design with ChatGPT to Generate Code
date: 2023-02-22 14:37:47
tags: [ChatGPT, AI, code generation, frontend, software engineering]
---

> You can find all the code of this article in this [codesandbox](https://codesandbox.io/s/focused-scott-0pxlid?file=/src/App.tsx).

A lot of people aren't aware that, nowadays, AI can really help us to write code! Trust me, I've been using chatGPT to help me write thousands of lines of code. Let me show you how.
I will take a frontend component as an example, show you how to build a product ready component. We use React to help us modulize our code, so chatGPT can generate code more precisely.
Just like humans, chatGPT is also not good at handling complex things at one time, so we need to make things simplier for chatGPT. One of the powerful ways to handle our system's complexity is **modulization**. We will start by building the most simple components, and then combining them together, to become a page. For demonstration, I will just do a simple `<DialogBox />` component here. You can use the same concept to build a big system(some dudes use it to build a new language).

**Requirements**:

Level 1:
1. `<DialogBox />`: The DialogBox component should be able to display a conversation between two users, with input area.

Clearly, if we just put the requirement above into chatGPT, it likely won't get us a satisfactory result. Because the module we gonna build is too big to describe it clearly. So let's split it into these several parts:

Level 2:
1. `<Messages />`: The Messages box should display users' conversation lists, on the left hand side is the other user's message. On the right hand side is the user's message.
2. `<TextArea />`：The TextArea should show placeholder to guide user input something, and when press enter key, it should call sendMessage.

We break a big component into two components. Now the problem has become smaller, but still a bit too much for chatGPT. Let's break it into pieces.

Level 3:
1. `<MessageBubble />`: The MessageBubble component should display the message text entered by a user, with the direction left or right.
2. `<Avatar />`: The Avatar component should display a profile picture or other visual representation of a user.
3. `<TextArea />`：Same as above.

These should be small enough for chatGPT to generate the code. So let's invite our AI friend, chatGPT, to help us finishned the components. 

**Implementations**:

All right! Before really starting development, we need to make sure that chatGPT and us are in the same context. We need to declare the dependencies that we have(for demonstration we only introduce simple dependencies, you can add much more if you want):

<img alt="chatgpt" src="/img/chatgpt/chatgpt-1.png">

As you can see, chatGPT is happy to help us write code. Let's go! Let's start from Level 3(the small peices) to Level 1.

Level 3:

1. `<TextArea />`

Let me describe the requirements to chatGPT:

<img alt="chatgpt" src="/img/chatgpt/chatgpt-2.png">

Here is what chatGPT return me:

<img alt="chatgpt" src="/img/chatgpt/chatgpt-3.png">

Here is the effect of the code:

<img alt="chatgpt" src="/img/chatgpt/chatgpt-4.png">

LGTM, the only thing I want to change is to make the textarea unable to resize. This is simple enough, so I just do it by myself. You can ask chatGPT to do it for sure.

2. `<Avatar />`

Let's finish the avatar component as well:

<img alt="chatgpt" src="/img/chatgpt/chatgpt-5.png">

<img alt="chatgpt" src="/img/chatgpt/chatgpt-6.png">

As you can see, it generates a super considerate code for me, a lot of the details that I didn't specify in my requirements! But we can bring the code to the next level without typing in any code. We just tell chatGPT to do so. Let me show you how(Here is just the demonstrate of how to let chatGPT improve the code, some code is unnecessary hah):

<img alt="chatgpt" src="/img/chatgpt/chatgpt-7.png">

Look at those codes, I think they are pretty good! What do you think? 

<img alt="chatgpt" src="/img/chatgpt/chatgpt-8.png">


<img alt="chatgpt" src="/img/chatgpt/chatgpt-9.png">

The result is like this, 

<img alt="chatgpt" src="/img/chatgpt/chatgpt-10.png">


3. `<MessageBubble />`

<img alt="chatgpt" src="/img/chatgpt/chatgpt-11.png">

ChatGPT return this:

```tsx
// MessageBubble.tsx
import React, { FC } from "react";
import styles from "./MessageBubble.module.scss";
import Avatar, { AvatarSize, AvatarType } from "../Avatar";

type Props = {
  text: string;
  direction: "left" | "right";
  imgUrl?: string;
  username?: string;
  avatarSize?: AvatarSize;
  avatarType?: AvatarType;
};

const MessageBubble: FC<Props> = ({
  text,
  direction,
  imgUrl,
  username,
  avatarSize = "small",
  avatarType = "square"
}) => {
  return (
    <div className={`${styles.messageBubble} ${styles[direction]}`}>
      {imgUrl && (
        <div className={styles.avatarWrapper}>
          <Avatar imgUrl={imgUrl} size={avatarSize} type={avatarType} />
        </div>
      )}
      <div className={styles.contentWrapper}>
        {username && <div className={styles.username}>{username}</div>}
        <div className={styles.messageText}>{text}</div>
      </div>
    </div>
  );
};

export default MessageBubble;
```

```scss
// MessageBubble.module.scss
.messageBubble {
  display: flex;
  align-items: center;
  .contentWrapper {
    display: inline-block;
    max-width: 80%;
    margin: 0.5rem;
    padding: 0.75rem;
    border-radius: 1rem;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 2px 6px 0 rgba(0, 0, 0, 0.05);
    background-color: #fff;
  }
}
.left {
  justify-content: flex-start;
}

.right {
  flex-direction: row-reverse;
  .username {
    display: flex;
    justify-content: flex-end;
  }
}

.avatarWrapper {
  margin-top: 0.5rem;
  margin-right: 0.5rem;
}

.username {
  font-size: 0.75rem;
  font-weight: 600;
  color: #999;
  margin-bottom: 0.25rem;
}

.messageText {
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  color: #333;
}
```

<img alt="chatgpt" src="/img/chatgpt/chatgpt-12.png">

The result is not bad, expect some style problems need to be adapted. Most of the code has no need to modify it.

Level 2:

From level 2, what we need to do is to combine the components that chatGPT previously built. Let's tell chatGPT to do so.

1. `<Messages />`

<img alt="chatgpt" src="/img/chatgpt/chatgpt-13.png">

```tsx
// Messages.tsx
import { FC } from 'react';
import styles from './Messages.module.scss';
import MessageBubble from '../MessageBubble';
import { Message } from './types';

type Props = {
  messages: Message[];
};

const Messages: FC<Props> = ({ messages }) => {
  return (
    <div className={styles.messagesWrapper}>
      {messages.map((message, index) => (
        <MessageBubble
          key={index}
          text={message.text}
          direction={message.direction}
          imgUrl={message.avatar}
          username={message.username}
        />
      ))}
    </div>
  );
};

export default Messages;
```

```scss
// Messages.module.scss
.messagesWrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-top: 1rem;
  margin-bottom: 1rem;
}
```

<img alt="chatgpt" src="/img/chatgpt/chatgpt-14.png">

Looks pretty good~

Level 1:
1. `<DialogBox />`

<img alt="chatgpt" src="/img/chatgpt/chatgpt-15.png">

```tsx
// Dialogbox.tsx
import { FC, useState, useEffect } from 'react';
import styles from './DialogBox.module.scss';
import Messages from './Messages';
import TextArea from './TextArea';
import { Message } from './types';

type Props = {
  getMessages: () => Promise<Message[]>;
  sendMessage: (text: string) => Promise<void>;
};

const DialogBox: FC<Props> = ({ getMessages, sendMessage }) => {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      getMessages().then((messages) => setMessages(messages));
    }, 1000);
    return () => clearInterval(interval);
  }, [getMessages]);

  const handleSendMessage = async (text: string) => {
    await sendMessage(text);
    const updatedMessages = await getMessages();
    setMessages(updatedMessages);
  };

  return (
    <div className={styles.dialogBox}>
      <div className={styles.messagesWrapper}>
        <Messages messages={messages} />
      </div>
      <div className={styles.textAreaWrapper}>
        <TextArea sendMessage={handleSendMessage} />
      </div>
    </div>
  );
};

export default DialogBox;
```

```scss
.dialogBox {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  height: 100%;
  margin: 1rem;
}

.messagesWrapper {
  flex: 1;
}

.textAreaWrapper {
  margin-top: 1rem;
}
```

<img alt="chatgpt" src="/img/chatgpt/chatgpt-16.png">

As you can see, most of the time, I'm not coding. Instead, I just design the components and tell chatGPT what it is. ChatGPT will just give me quite a satisfactory result. After a simple code review, the development is done. The key is to separate big problems into small problems, so that we can describe them clearly and chatGPT is easier to understand. We can use this method to build some huge systems. It is possible.
