---
title: "Why I Chose Zustand for Agent-Written Frontend Code"
date: 2026-11-23 09:30:00
tags: [Frontend, React, AI, Software Engineering]
area: engineering
summary: "My team is moving a large ecommerce web app into another repository, with coding agents writing most of the code. Before we started I compared useEffect chains, Redux Toolkit, MobX, Jotai and Zustand, and picked Zustand."
description: "Picking a state library for a web migration written mostly by coding agents: where useEffect, Redux Toolkit, MobX and Jotai fall short, and why Zustand fits."
lang: en
i18n_key: Why-I-Chose-Zustand-for-Agent-Written-Frontend-Code
---

My team recently started a very large refactor. We are moving the web front end of an ecommerce platform into another repository, and many pages and capabilities will later be reused and extended there. The codebase carries years of history and the business flows are long, so rewriting it by hand is not realistic. Coding agents will do much of the work: reading the old logic, generating the new code, and filling in the verification.

That brings a new risk. Once AI writes code this fast, developers can no longer read every detail line by line. If the repository has blurry boundaries and its state transitions depend on unwritten rules, an agent will quickly turn out code that looks like it works and hides problems. People call this AI slop.

Before the migration started in earnest, I reviewed our frontend choices for working with agents, state management above all. I compared chaining local state with `useEffect`, Redux Toolkit, MobX, Jotai, and Zustand, and chose Zustand.

## `useEffect` chains: where agents break things first

A core rule of thumb in AI engineering: any feature that takes nuance and implicit context to use well tends to become slop in an agent's hands. On the frontend, the standard example is using `useEffect` to link one piece of state to another.

Having cause and effect in plain sight matters to people and matters more to an agent. A user action is easiest to follow when everything it causes is written in one handler that reads top to bottom. Take "Add to cart" on a product page. If the code first changes a piece of state and then relies on a `useEffect` watching that state to trigger the next step, the reader has to keep several things in their head:

- Which places change this state, and whether another branch changes it in passing.
- When the effect fires, and whether a dependency change makes it run one extra time.
- Whether the side effect needs cleanup when the page unmounts or the state switches.

People forget these. An agent can only load a limited set of files each time it works, so trigger chains that are spread across other files and have to be inferred are the part it is most likely to miss. It is also where an agent most easily writes a race condition or an infinite loop.

So when the refactor was approved, we set a basic rule: move complex state transitions and side effects out of components into a single, explicit state layer that can be read in one pass. Business logic that components used to assemble with `useEffect` goes there.

## Redux Toolkit, MobX, Jotai: what each costs an agent

There are several mature libraries for keeping state and actions in one place. They differ mainly in the rules a state change has to follow. With an agent doing the writing, each of the three alternatives has a weak spot.

### Redux Toolkit: clear change history, heavy boilerplate

Redux makes every change traceable: a component dispatches an action, and a reducer computes the next state with a pure function. The price is boilerplate and concepts. A complete async add-to-cart flow (start the request, update the badge on success, show a message on failure) usually touches a slice, a thunk, `extraReducers`, selectors, and a top-level provider. To change one feature, an agent has to patch glue code in several places. That spends context window, and in complicated async branches the agent tends to write something long-winded or drop a state.

### MobX: pleasant to write, implicit dependencies

With MobX you assign to a property, and dependency tracking and UI updates happen on their own. In a complex ecommerce app, once the state tree grows and async callbacks pile up, it is hard to see from the code who changed which property and why a chain of updates fired. An agent also slips easily into mutating state from anywhere and leaning on implicit reactions, which makes later debugging expensive.

### Jotai: good fine-grained updates, scattered multistep flows

Jotai splits state into independent atoms, and its fine-grained local updates are very good. Ecommerce is flow-heavy, though. One add-to-cart has to coordinate the item list, the loading state, the error message, and the cart badge, so a single action touches several separate atoms. As the business grows the number of atoms balloons, and an agent in the middle of a multistep flow can easily miss one related atom.

## Zustand: one store, one-way flow, little boilerplate

After the comparison, Zustand looked to me like Redux with the central store and one-way flow kept and most of the boilerplate removed. Four properties make it a good fit for agents.

### One way to write it

An agent does badly with a framework that has ten schools of thought and five escape hatches. Zustand has essentially one standard shape: `create` a store, with the state data in one half and the methods that change it (actions) in the other. There are no action type constants and no nested `<Provider>` layers. The template the agent reads and the code it writes have the same structure every time, so style drift mostly goes away.

### Cause and effect in one function

Here is the add-to-cart example in Zustand:

```tsx
import { create } from 'zustand';

interface CartState {
  items: string[];
  loading: boolean;
  error: string | null;
  addItem: (sku: string) => Promise<void>;
}

const useCartStore = create<CartState>((set) => ({
  items: [],
  loading: false,
  error: null,
  addItem: async (sku) => {
    set({ loading: true, error: null });
    try {
      const addedSku = await addToCartApi(sku);
      set((state) => ({
        items: [...state.items, addedSku],
        loading: false,
      }));
    } catch (e: any) {
      set({
        error: e.message ?? 'Failed to add to cart',
        loading: false,
      });
    }
  },
}));
```

The components stay small. The top navigation subscribes to `items.length` to show the badge, and the product page button calls `addItem('SKU-1001')` in `onClick`. Sending the request, switching the loading flag, updating the list, and catching the error are all written in order inside `addItem`. An agent can read that one function and see the whole chain, and no component needs a `useEffect` that watches state.

### Compact context

In a large migration, an agent should be able to see the whole cause and effect of a feature inside one small context window. A single business store in Zustand is usually one or two hundred lines, with the state definition, the types, and the async actions in one file. The agent reads it once and has every constraint, which saves tokens and makes its edits more accurate.

### Runs without React

Whether an agent can verify its own work decides how much we trust it. A Zustand store is not tied to the React component tree. In a plain TypeScript unit test or a Node script, `useCartStore.getState()` reads the state and calls the actions directly, so checking a state transition costs very little.

## Guardrails: directories, lint rules, verification

Zustand's weakness is that it is too permissive. Without constraints, an agent or a developer can still pile unrelated logic into one giant store, or call `setState` from a component and bypass the actions.

In this repository we are pairing the written conventions with three layers of engineering guardrails:

1. Directory structure is the boundary. Stores are split by business domain (feature), shared and business layers depend in one direction only, and modules cannot reach into each other's internal state.
2. Lint rules close the escape hatches. Using `useEffect` for state synchronization in business components is tightly restricted. Components may only call the named actions a store exposes, and outside code cannot modify the underlying state fields directly.
3. Verification backs it all up. After changing a store and its UI, the agent must add unit tests for the state transitions and an end-to-end smoke check. Human review shifts from checking syntax and side-effect hazards line by line to looking at run artifacts and confirming the business intent.

## What I look for now

The criteria for choosing technology are changing. We used to ask first how impressive something was to write by hand and how flexible its abstractions were. Now we need to ask how clear the boundaries are, how compact the context is, and how little room the AI has to get things wrong.

For a migration of this size, Zustand's small structure keeps state and side effects in one place and puts cause and effect back in plain sight. That is what lets us hand a larger share of the coding to agents.
