---
title: 使用模块化设计与 ChatGPT 生成代码
date: 2023-02-22 14:37:47
tags: [ChatGPT, AI, code generation, frontend, software engineering]
lang: zh
i18n_key: Use-Modular-Design-with-ChatGPT-to-Generate-Code
permalink: zh/2023/02/22/Use-Modular-Design-with-ChatGPT-to-Generate-Code/
---

> 你可以在这个 [codesandbox](https://codesandbox.io/s/focused-scott-0pxlid?file=/src/App.tsx) 中找到本文的所有代码。

很多人没有意识到，如今 AI 真的可以帮助我们写代码！相信我，我一直在使用 chatGPT 帮助我写了数千行代码。让我来告诉你怎么做。
我将以一个前端组件为例，向你展示如何构建一个生产就绪的组件。我们使用 React 来帮助我们模块化代码，这样 chatGPT 就可以更精准地生成代码。
就像人类一样，chatGPT 也不擅长一次处理复杂的事情，所以我们需要为 chatGPT 简化事情。处理系统复杂性的一个强大方法是**模块化**。我们将从构建最简单的组件开始，然后将它们组合在一起，形成一个页面。为了演示，我这里只做一个简单的 `<DialogBox />` 组件。你可以用同样的概念来构建一个大型系统（有些人用它来构建一门新的编程语言）。

**需求**：

第一层：
1. `<DialogBox />`：DialogBox 组件应该能够显示两个用户之间的对话，并带有输入区域。

显然，如果我们只是把上面的需求放入 chatGPT，很可能得不到令人满意的结果。因为我们要构建的模块太大，很难清晰地描述它。所以让我们把它拆分成以下几个部分：

第二层：
1. `<Messages />`：消息框应该显示用户的对话列表，左侧是对方的消息，右侧是用户自己的消息。
2. `<TextArea />`：TextArea 应该显示占位符来引导用户输入内容，当按下回车键时，它应该调用 sendMessage。

我们把一个大组件拆成了两个组件。现在问题变小了，但对 chatGPT 来说仍然有点多。让我们继续拆分。

第三层：
1. `<MessageBubble />`：MessageBubble 组件应该显示用户输入的消息文本，方向为左或右。
2. `<Avatar />`：Avatar 组件应该显示用户的头像或其他视觉表示。
3. `<TextArea />`：同上。

这些对于 chatGPT 生成代码来说应该足够小了。那么让我们邀请我们的 AI 朋友 chatGPT 来帮助我们完成这些组件。

**实现**：

好的！在真正开始开发之前，我们需要确保 chatGPT 和我们处于相同的上下文中。我们需要声明我们拥有的依赖（为了演示，我们只引入简单的依赖，你可以根据需要添加更多）：

<img alt="chatgpt" src="/img/chatgpt/chatgpt-1.png">

如你所见，chatGPT 很乐意帮助我们写代码。让我们开始吧！从第三层（最小的部分）开始到第一层。

第三层：

1. `<TextArea />`

让我把需求描述给 chatGPT：

<img alt="chatgpt" src="/img/chatgpt/chatgpt-2.png">

这是 chatGPT 给我返回的内容：

<img alt="chatgpt" src="/img/chatgpt/chatgpt-3.png">

这是代码的效果：

<img alt="chatgpt" src="/img/chatgpt/chatgpt-4.png">

看起来不错，我唯一想改的是让文本区域无法调整大小。这很简单，我就自己来做了。你当然也可以让 chatGPT 来做。

2. `<Avatar />`

让我们也完成 avatar 组件：

<img alt="chatgpt" src="/img/chatgpt/chatgpt-5.png">

<img alt="chatgpt" src="/img/chatgpt/chatgpt-6.png">

如你所见，它为我生成了非常周到的代码，很多细节是我在需求中没有指定的！但我们可以在不输入任何代码的情况下将代码提升到更高的水平。我们只需告诉 chatGPT 这样做即可。让我来展示一下（这里只是演示如何让 chatGPT 改进代码，一些代码是不必要的哈）：

<img alt="chatgpt" src="/img/chatgpt/chatgpt-7.png">

看看这些代码，我觉得它们相当不错！你觉得呢？

<img alt="chatgpt" src="/img/chatgpt/chatgpt-8.png">


<img alt="chatgpt" src="/img/chatgpt/chatgpt-9.png">

结果是这样的，

<img alt="chatgpt" src="/img/chatgpt/chatgpt-10.png">


3. `<MessageBubble />`

<img alt="chatgpt" src="/img/chatgpt/chatgpt-11.png">

ChatGPT 返回了这个：

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

结果还不错，除了一些需要适配的样式问题。大部分代码都不需要修改。

第二层：

从第二层开始，我们需要做的是组合 chatGPT 之前构建的组件。让我们告诉 chatGPT 这样做。

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

看起来相当不错~

第一层：
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

如你所见，大多数时候我并不在写代码，而是设计组件并告诉 chatGPT 它是什么。ChatGPT 会给我一个相当令人满意的结果。经过简单的代码审查，开发就完成了。关键在于将大问题拆分成小问题，这样我们就可以清楚地描述它们，chatGPT 也更容易理解。我们可以用这种方法来构建一些大型系统，这是完全可行的。
