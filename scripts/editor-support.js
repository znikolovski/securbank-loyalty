import { showSlide, startInterval, stopInterval } from '../blocks/carousel/carousel.js';
import {
  decorateBlock,
  decorateBlocks,
  decorateButtons,
  decorateIcons,
  decorateSections,
  loadBlock,
  loadSections,
} from './aem.js';
import { decorateRichtext } from './editor-support-rte.js';
import { decorateMain } from './scripts.js';

/**
 *
 * @param {HTMLElement} block
 * Use this function to trigger a mutation for the UI editor overlay when you
 * have a scrollable block
 */
function createMutation(block) {
  block.setAttribute('xwalk-scroll-mutation', 'true');
  block.querySelector('.carousel-slides').onscrollend = () => {
    block.removeAttribute('xwalk-scroll-mutation');
  };
}

function getState(block) {
  if (block.matches('.accordion')) {
    return [...block.querySelectorAll('details[open]')]
      .map((details) => details.dataset.aueResource);
  }
  if (block.matches('.carousel')) {
    return block.dataset.activeSlide;
  }
  return null;
}

function setState(block, state) {
  if (block.matches('.accordion')) {
    block.querySelectorAll('details').forEach((details) => {
      details.open = state.includes(details.dataset.aueResource);
    });
  }
  if (block.matches('.carousel')) {
    block.style.display = null;
    createMutation(block);
    showSlide(block, state);
  }
}

async function applyChanges(event) {
  // redecorate default content and blocks on patches (in the properties rail)
  const { detail } = event;

  const resource = detail?.request?.target?.resource // update, patch components
    || detail?.request?.target?.container?.resource // update, patch, add to sections
    || detail?.request?.to?.container?.resource; // move in sections
  if (!resource) return false;
  const updates = detail?.response?.updates;
  if (!updates.length) return false;
  const { content } = updates[0];
  if (!content) return false;

  const parsedUpdate = new DOMParser().parseFromString(content, 'text/html');
  const element = document.querySelector(`[data-aue-resource="${resource}"]`);

  if (element) {
    if (element.matches('main')) {
      const newMain = parsedUpdate.querySelector(`[data-aue-resource="${resource}"]`);
      newMain.style.display = 'none';
      element.insertAdjacentElement('afterend', newMain);
      decorateMain(newMain);
      decorateRichtext(newMain);
      await loadSections(newMain);
      element.remove();
      newMain.style.display = null;
      // eslint-disable-next-line no-use-before-define
      attachEventListners(newMain);
      return true;
    }
    if (element.matches('.fragment-wrapper')) {
      return false;
    }
    const block = element.parentElement?.closest('.block[data-aue-resource]') || element?.closest('.block[data-aue-resource]');
    if (block) {
      const state = getState(block);
      const blockResource = block.getAttribute('data-aue-resource');
      const newBlock = parsedUpdate.querySelector(`[data-aue-resource="${blockResource}"]`);
      if (newBlock) {
        newBlock.style.display = 'none';
        block.insertAdjacentElement('afterend', newBlock);
        decorateButtons(newBlock);
        decorateIcons(newBlock);
        decorateBlock(newBlock);
        decorateRichtext(newBlock);
        await loadBlock(newBlock);
        block.remove();
        setState(newBlock, state);
        newBlock.style.display = null;
        return true;
      }
    } else {
      // sections and default content, may be multiple in the case of richtext
      const newElements = parsedUpdate.querySelectorAll(`[data-aue-resource="${resource}"],[data-richtext-resource="${resource}"]`);
      if (newElements.length) {
        const { parentElement } = element;
        if (element.matches('.section')) {
          const [newSection] = newElements;
          newSection.style.display = 'none';
          element.insertAdjacentElement('afterend', newSection);
          decorateButtons(newSection);
          decorateIcons(newSection);
          decorateRichtext(newSection);
          decorateSections(parentElement);
          decorateBlocks(parentElement);
          await loadSections(parentElement);
          element.remove();
          newSection.style.display = null;
        } else {
          element.replaceWith(...newElements);
          decorateButtons(parentElement);
          decorateIcons(parentElement);
          decorateRichtext(parentElement);
        }
        return true;
      }
    }
  }

  return false;
}

function handleSelection(event) {
  const { detail } = event;
  const resource = detail?.resource;

  if (resource) {
    const element = document.querySelector(`[data-aue-resource="${resource}"]`);
    const block = element.parentElement?.closest('.block[data-aue-resource]') || element?.closest('.block[data-aue-resource]');

    if (block && block.matches('.accordion')) {
      // close all details
      block.querySelectorAll('details').forEach((details) => {
        details.open = false;
      });
      const details = element.matches('details') ? element : element.querySelector('details');
      details.open = true;
    }

    if (block && block.matches('.carousel')) {
      createMutation(block);
    }
    if (block && block.matches('.tabs')) {
      const tabs = [...block.querySelectorAll('.tabs-panel > div')];
      const index = tabs.findIndex((tab) => tab.dataset.aueResource === resource);
      if (index !== -1) {
        block.querySelectorAll('.tabs-list button')[index]?.click();
      }
    }
  }
}

function attachEventListners(main) {
  [
    'aue:content-patch',
    'aue:content-update',
    'aue:content-add',
    'aue:content-move',
    'aue:content-remove',
  ].forEach((eventType) => main?.addEventListener(eventType, async (event) => {
    event.stopPropagation();
    const applied = await applyChanges(event);
    if (!applied) window.location.reload();
  }));

  main?.addEventListener('aue:ui-select', handleSelection);
}

attachEventListners(document.querySelector('main'));

document.querySelectorAll('.block.carousel').forEach((carousel) => {
  stopInterval(carousel);
});

document.querySelectorAll('.block.carousel').forEach((carousel) => {
  // when entering edit mode stop scrolling
  document.addEventListener('aue:ui-edit', () => {
    stopInterval(carousel);
  });

  // when entering preview mode start scrolling
  document.addEventListener('aue:ui-preview', () => {
    startInterval(carousel);
  });
});