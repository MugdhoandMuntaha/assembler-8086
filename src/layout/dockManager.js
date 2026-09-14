/**
 * Advanced VS Code Style Docking & Drag-to-Place Layout Engine
 */

export const PRESETS = {
  VSCODE: {
    type: 'split',
    direction: 'row',
    children: [
      {
        type: 'split',
        direction: 'col',
        flex: 1.8,
        children: [
          { type: 'panel', id: 'panel-editor', flex: 1.4 },
          { type: 'panel', id: 'panel-terminal', flex: 1 }
        ]
      },
      { type: 'panel', id: 'panel-cpu', flex: 1.2 }
    ]
  },
  COLUMNS: {
    type: 'split',
    direction: 'row',
    children: [
      { type: 'panel', id: 'panel-editor', flex: 1.1 },
      { type: 'panel', id: 'panel-cpu', flex: 1 },
      { type: 'panel', id: 'panel-terminal', flex: 1 }
    ]
  },
  BOTTOM_TERM: {
    type: 'split',
    direction: 'col',
    children: [
      {
        type: 'split',
        direction: 'row',
        flex: 1.5,
        children: [
          { type: 'panel', id: 'panel-editor', flex: 1.2 },
          { type: 'panel', id: 'panel-cpu', flex: 1 }
        ]
      },
      { type: 'panel', id: 'panel-terminal', flex: 1 }
    ]
  }
};

export class DockManager {
  constructor(container, panelsMap, onLayoutChange, onUserDock) {
    this.container = container;
    this.panelsMap = panelsMap; // id -> HTMLElement
    this.onLayoutChange = onLayoutChange;
    this.onUserDock = onUserDock;
    this.tree = JSON.parse(JSON.stringify(PRESETS.VSCODE)); // Default to VS Code layout

    this.activeDrag = null;
    this.dropOverlay = null;
    this.currentDropTarget = null; // { targetId, position: 'top'|'bottom'|'left'|'right' }

    this.initOverlay();
    this.initDragListeners();
    this.render();
  }

  initOverlay() {
    this.dropOverlay = document.createElement('div');
    this.dropOverlay.className = 'dock-drop-overlay';
    this.dropOverlay.innerHTML = `
      <div class="dock-zone dock-zone-top" data-pos="top"><span>↑ Place on Top</span></div>
      <div class="dock-zone dock-zone-bottom" data-pos="bottom"><span>↓ Place at Bottom</span></div>
      <div class="dock-zone dock-zone-left" data-pos="left"><span>← Place on Left</span></div>
      <div class="dock-zone dock-zone-right" data-pos="right"><span>→ Place on Right</span></div>
      <div class="dock-zone-preview"></div>
    `;
    this.dropOverlay.style.display = 'none';
    document.body.appendChild(this.dropOverlay);
  }

  initDragListeners() {
    for (const [panelId, panel] of Object.entries(this.panelsMap)) {
      const header = panel.querySelector('.panel-header');
      if (!header) continue;

      header.addEventListener('pointerdown', (e) => {
        // Only trigger drag on primary (left) button
        if (e.button !== 0) return;
        // Skip drag if clicking action buttons or inputs or in floating mode
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
        if (panel.classList.contains('is-floating') || panel.classList.contains('is-maximized')) return;

        this.startDrag(panelId, e);
      });
    }
  }

  startDrag(panelId, startEvent) {
    startEvent.preventDefault();
    this.activeDrag = {
      panelId,
      startX: startEvent.clientX,
      startY: startEvent.clientY,
      hasMoved: false
    };

    const preview = this.dropOverlay.querySelector('.dock-zone-preview');
    const header = this.panelsMap[panelId]?.querySelector('.panel-header');
    try {
      header?.setPointerCapture(startEvent.pointerId);
    } catch (_) {}

    const onPointerMove = (e) => {
      if (!this.activeDrag) return;

      const dist = Math.hypot(e.clientX - this.activeDrag.startX, e.clientY - this.activeDrag.startY);
      if (dist > 8 && !this.activeDrag.hasMoved) {
        this.activeDrag.hasMoved = true;
        document.body.classList.add('is-dock-dragging');
        if (this.panelsMap[panelId]) {
          this.panelsMap[panelId].classList.add('is-dock-source');
        }
      }

      if (!this.activeDrag.hasMoved) return;

      // Find panel under pointer (other than dragged panel)
      const elBelow = document.elementFromPoint(e.clientX, e.clientY);
      const targetPanel = elBelow ? elBelow.closest('.panel') : null;

      if (targetPanel && targetPanel.id !== panelId && !targetPanel.classList.contains('is-floating')) {
        const rect = targetPanel.getBoundingClientRect();
        this.dropOverlay.style.display = 'block';
        this.dropOverlay.style.top = `${rect.top}px`;
        this.dropOverlay.style.left = `${rect.left}px`;
        this.dropOverlay.style.width = `${rect.width}px`;
        this.dropOverlay.style.height = `${rect.height}px`;

        // Calculate relative position within target panel
        const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / (rect.width || 1)));
        const relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / (rect.height || 1)));

        const distTop = relY;
        const distBottom = 1 - relY;
        const distLeft = relX;
        const distRight = 1 - relX;
        const minDist = Math.min(distTop, distBottom, distLeft, distRight);

        let pos = 'bottom';
        if (minDist === distTop) pos = 'top';
        else if (minDist === distBottom) pos = 'bottom';
        else if (minDist === distLeft) pos = 'left';
        else pos = 'right';

        this.currentDropTarget = { targetId: targetPanel.id, position: pos };

        // Position preview box
        preview.style.display = 'block';
        if (pos === 'top') {
          preview.style.top = '0'; preview.style.left = '0'; preview.style.width = '100%'; preview.style.height = '50%';
        } else if (pos === 'bottom') {
          preview.style.top = '50%'; preview.style.left = '0'; preview.style.width = '100%'; preview.style.height = '50%';
        } else if (pos === 'left') {
          preview.style.top = '0'; preview.style.left = '0'; preview.style.width = '50%'; preview.style.height = '100%';
        } else if (pos === 'right') {
          preview.style.top = '0'; preview.style.left = '50%'; preview.style.width = '50%'; preview.style.height = '100%';
        }

        // Highlight zone button
        this.dropOverlay.querySelectorAll('.dock-zone').forEach(z => {
          z.classList.toggle('active', z.dataset.pos === pos);
        });
      } else {
        this.currentDropTarget = null;
        this.dropOverlay.style.display = 'none';
        preview.style.display = 'none';
        this.dropOverlay.querySelectorAll('.dock-zone').forEach(z => z.classList.remove('active'));
      }
    };

    const cleanup = () => {
      document.body.classList.remove('is-dock-dragging');
      this.dropOverlay.style.display = 'none';
      preview.style.display = 'none';
      this.dropOverlay.querySelectorAll('.dock-zone').forEach(z => z.classList.remove('active'));

      if (this.panelsMap[panelId]) {
        this.panelsMap[panelId].classList.remove('is-dock-source');
      }

      try {
        if (header?.hasPointerCapture(startEvent.pointerId)) {
          header.releasePointerCapture(startEvent.pointerId);
        }
      } catch (_) {}

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
    };

    const onPointerUp = () => {
      const dropTarget = this.currentDropTarget;
      const hadMoved = this.activeDrag?.hasMoved;
      const dragPanelId = this.activeDrag?.panelId;

      cleanup();

      this.activeDrag = null;
      this.currentDropTarget = null;

      if (hadMoved && dropTarget && dragPanelId) {
        this.dockPanel(dragPanelId, dropTarget.targetId, dropTarget.position);
      }
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        this.activeDrag = null;
        this.currentDropTarget = null;
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
  }

  // Move sourcePanelId to position relative to targetPanelId
  dockPanel(sourceId, targetId, position) {
    if (sourceId === targetId) return;

    // 1. Remove source node from tree
    this.tree = this.removeNode(this.tree, sourceId);
    this.cleanTree(this.tree);

    // 2. Insert source node adjacent to target node
    this.insertNode(this.tree, sourceId, targetId, position);
    this.cleanTree(this.tree);

    // 3. Re-render layout
    this.render();
    if (this.onLayoutChange) {
      this.onLayoutChange();
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          if (this.onLayoutChange) this.onLayoutChange();
        });
      }
      setTimeout(() => {
        if (this.onLayoutChange) this.onLayoutChange();
      }, 100);
    }
    if (this.onUserDock) this.onUserDock();
  }

  removeNode(node, panelId) {
    if (!node) return null;
    if (node.type === 'panel') {
      return node.id === panelId ? null : node;
    }

    if (node.type === 'split') {
      node.children = node.children
        .map(child => this.removeNode(child, panelId))
        .filter(Boolean);
      return node;
    }
    return node;
  }

  cleanTree(node) {
    if (!node || node.type !== 'split') return node;

    // Clean children first
    node.children = node.children.map(c => this.cleanTree(c)).filter(Boolean);

    // Flatten nested splits with same direction
    const flattened = [];
    for (const child of node.children) {
      if (child.type === 'split' && child.direction === node.direction) {
        flattened.push(...child.children);
      } else {
        flattened.push(child);
      }
    }
    node.children = flattened;

    if (node.children.length === 0) {
      return null;
    }

    // If split has only 1 child, hoist it
    if (node.children.length === 1) {
      const single = node.children[0];
      for (const key of Object.keys(node)) {
        delete node[key];
      }
      Object.assign(node, single);
    }
    return node;
  }

  insertNode(node, sourceId, targetId, position) {
    if (!node) return false;
    if (node.type === 'panel' && node.id === targetId) {
      const isVertical = position === 'top' || position === 'bottom';
      const dir = isVertical ? 'col' : 'row';
      const sourceFirst = position === 'top' || position === 'left';

      const newNode = {
        type: 'split',
        direction: dir,
        flex: node.flex || 1,
        children: sourceFirst
          ? [{ type: 'panel', id: sourceId, flex: 1 }, { type: 'panel', id: targetId, flex: 1 }]
          : [{ type: 'panel', id: targetId, flex: 1 }, { type: 'panel', id: sourceId, flex: 1 }]
      };

      for (const key of Object.keys(node)) {
        delete node[key];
      }
      Object.assign(node, newNode);
      return true;
    }

    if (node.type === 'split') {
      for (const child of node.children) {
        if (this.insertNode(child, sourceId, targetId, position)) return true;
      }
    }
    return false;
  }

  setPreset(presetKey) {
    if (PRESETS[presetKey]) {
      this.tree = JSON.parse(JSON.stringify(PRESETS[presetKey]));
      this.render();
      if (this.onLayoutChange) {
        this.onLayoutChange();
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(() => {
            if (this.onLayoutChange) this.onLayoutChange();
          });
        }
      }
    }
  }

  render() {
    const domNode = this.buildDOM(this.tree);
    if (domNode) {
      this.container.replaceChildren(domNode);
    }
    this.setupSplitters(this.container);
  }

  buildDOM(node) {
    if (!node) return null;

    if (node.type === 'panel') {
      const panelEl = this.panelsMap[node.id];
      if (panelEl) {
        panelEl.style.flex = `${node.flex || 1} 1 0px`;
        panelEl.style.minWidth = '180px';
        panelEl.style.minHeight = '140px';
        return panelEl;
      }
      return null;
    }

    if (node.type === 'split') {
      const splitEl = document.createElement('div');
      splitEl.className = `dock-split dock-${node.direction}`;
      splitEl.style.flex = `${node.flex || 1} 1 0px`;

      for (let i = 0; i < node.children.length; i++) {
        const childDOM = this.buildDOM(node.children[i]);
        if (childDOM) {
          splitEl.appendChild(childDOM);
        }

        // Add resizer gutter between siblings
        if (i < node.children.length - 1) {
          const gutter = document.createElement('div');
          gutter.className = `dock-resizer dock-resizer-${node.direction}`;
          gutter.innerHTML = '<div class="dock-resizer-line"></div>';
          splitEl.appendChild(gutter);
        }
      }
      return splitEl;
    }

    return null;
  }

  setupSplitters(root) {
    const resizers = root.querySelectorAll('.dock-resizer');

    resizers.forEach(gutter => {
      const isCol = gutter.classList.contains('dock-resizer-col');
      const prev = gutter.previousElementSibling;
      const next = gutter.nextElementSibling;

      if (!prev || !next) return;

      gutter.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        gutter.classList.add('is-dragging');
        document.body.style.cursor = isCol ? 'row-resize' : 'col-resize';
        document.body.style.userSelect = 'none';

        try {
          gutter.setPointerCapture(e.pointerId);
        } catch (_) {}

        const startCoord = isCol ? e.clientY : e.clientX;
        const prevSize = isCol ? prev.getBoundingClientRect().height : prev.getBoundingClientRect().width;
        const nextSize = isCol ? next.getBoundingClientRect().height : next.getBoundingClientRect().width;

        const onPointerMove = (moveEvt) => {
          const delta = (isCol ? moveEvt.clientY : moveEvt.clientX) - startCoord;
          const newPrevSize = prevSize + delta;
          const newNextSize = nextSize - delta;

          const min = isCol ? 100 : 180;
          if (newPrevSize >= min && newNextSize >= min) {
            prev.style.flex = `0 0 ${newPrevSize}px`;
            next.style.flex = `0 0 ${newNextSize}px`;
            if (this.onLayoutChange) this.onLayoutChange();
          }
        };

        const onPointerUp = () => {
          try {
            if (gutter.hasPointerCapture(e.pointerId)) {
              gutter.releasePointerCapture(e.pointerId);
            }
          } catch (_) {}
          gutter.classList.remove('is-dragging');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
          if (this.onLayoutChange) this.onLayoutChange();
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
      });
    });
  }
}
