import React from 'react';
import {
  Box, Button, Heading, Keyboard, Stack, Text,
} from 'grommet';
import { Add, Folder, FormDown, FormNext, Redo, Share, Undo } from 'grommet-icons';
import { types } from '../types';
import {
  childSelected, getParent, getScreenForComponent, nextSiblingSelected,
  parentSelected, previousSiblingSelected, isDescendent,
} from '../design';
import ActionButton from '../components/ActionButton';
import AddComponent from './AddComponent';
import DesignSettings from '../DesignSettings';
import Designs from './Designs';
import Sharing from './Share';

const treeName = component =>
  (component.name || component.text
    || component.props.name || component.props.label
    || component.type);

const Tree = ({
  colorMode, design, selected, theme, onChange, onUndo, onRedo,
}) => {

  const [dragging, setDragging] = React.useState();
  const [dropTarget, setDropTarget] = React.useState();
  const [dropWhere, setDropWhere] = React.useState();
  const [draggingScreen, setDraggingScreen] = React.useState();
  const [dropScreenTarget, setDropScreenTarget] = React.useState();
  const [adding, setAdding] = React.useState();
  const [choosing, setChoosing] = React.useState();
  const [editing, setEditing] = React.useState();
  const [sharing, setSharing] = React.useState();
  const selectedRef = React.useRef();

  React.useEffect(() => {
    if (selectedRef.current) {
      const rect = selectedRef.current.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        selectedRef.current.scrollIntoView();
      }
    }
  }, [selectedRef])

  const select = (selected) => onChange({ selected })

  const moveChild = () => {
    const nextDesign = JSON.parse(JSON.stringify(design));
    // remove from old parent
    const priorParent = getParent(nextDesign, dragging);
    const priorIndex = priorParent.children.indexOf(dragging);
    priorParent.children.splice(priorIndex, 1);
    // if we're moving within children, promote children first
    if (isDescendent(design, dropTarget, dragging)) {
      const component = nextDesign.components[dragging];
      priorParent.children = [...priorParent.children, ...component.children];
      component.children = undefined;
    }
    // insert into new parent
    if (dropWhere === 'in') {
      const nextParent = nextDesign.components[dropTarget];
      if (!nextParent.children) nextParent.children = [];
      nextParent.children.unshift(dragging);
    } else {
      const nextParent = getParent(nextDesign, dropTarget);
      const nextIndex = nextParent.children.indexOf(dropTarget);
      nextParent.children.splice(dropWhere === 'before'
        ? nextIndex : nextIndex + 1, 0, dragging);
    }
    const nextScreen = getScreenForComponent(nextDesign, dragging);
    setDragging(undefined);
    setDropTarget(undefined);
    onChange({
      design: nextDesign,
      selected: { screen: nextScreen , component: dragging },
    });
  }

  const moveScreen = () => {
    const nextDesign = JSON.parse(JSON.stringify(design));
    const moveIndex = nextDesign.screenOrder.indexOf(dragging);
    nextDesign.screenOrder.splice(moveIndex, 1);
    const targetIndex = nextDesign.screenOrder.indexOf(dropScreenTarget);
    nextDesign.screenOrder.splice(dropWhere === 'before'
      ? targetIndex : targetIndex + 1, 0, dragging);
    setDraggingScreen(undefined);
    setDropScreenTarget(undefined);
    onChange({ design: nextDesign });
  }

  const toggleCollapse = (id) => {
    const nextDesign = JSON.parse(JSON.stringify(design));
    const component = nextDesign.components[id];
    component.collapsed = !component.collapsed;
    onChange({ design: nextDesign, selected: { ...selected, component: id } });
  }

  const onKey = (event) => {
    if (document.activeElement === document.body) {
      if (event.key === 'a') {
        setAdding(true);
      }
      if (event.key === 'ArrowDown') {
        onChange({ selected:
          (nextSiblingSelected(design, selected) || selected) });
      }
      if (event.key === 'ArrowUp') {
        onChange({ selected:
          (previousSiblingSelected(design, selected) || selected) });
      }
      if (event.key === 'ArrowLeft') {
        onChange({ selected: (parentSelected(design, selected) || selected) });
      }
      if (event.key === 'ArrowRight') {
        onChange({ selected: (childSelected(design, selected) || selected) });
      }
      if (onUndo && event.key === 'z') {
        onUndo();
      }
      if (onRedo && event.key === 'Z') {
        onRedo();
      }
      if (event.key === 'c') {
        toggleCollapse(selected.component);
      }
    }
  }

  const renderDropArea = (id, where) => {
    return (
      <Box
        pad="xxsmall"
        background={dragging && dropTarget
          && dropTarget === id && dropWhere === where
          ? 'accent-2' : undefined}
        onDragEnter={(event) => {
          if (dragging && dragging !== id) {
            event.preventDefault();
            setDropTarget(id);
            setDropWhere(where);
          } else {
            setDropTarget(undefined);
          }
        }}
        onDragOver={(event) => {
          if (dragging && dragging !== id) {
            event.preventDefault();
          }
        }}
        onDrop={moveChild}
      />
    );
  }

  const renderScreenDropArea = (screenId, where) => {
    return (
      <Box
        pad="xxsmall"
        background={draggingScreen
          && dropScreenTarget && dropScreenTarget === screenId
          && dropWhere === where
          ? 'accent-2' : undefined}
        onDragEnter={(event) => {
          if (draggingScreen && draggingScreen !== screenId) {
            event.preventDefault();
            setDropScreenTarget(screenId);
            setDropWhere(where);
          } else {
            setDropScreenTarget(undefined);
          }
        }}
        onDragOver={(event) => {
          if (draggingScreen && draggingScreen !== screenId) {
            event.preventDefault();
          }
        }}
        onDrop={moveScreen}
      />
    );
  }

  const renderComponent = (screen, id, firstChild) => {
    const component = design.components[id];
    if (!component) return null;
    const type = types[component.type];
    const reference = (component.type === 'Reference'
      && design.components[component.props.component]);
    const collapserColor = { light: 'light-4', dark: 'dark-3' };
    return (
      <Box key={id}>
        {firstChild && renderDropArea(id, 'before')}
        <Stack anchor="left">
          <Button
            fill
            hoverIndicator
            onClick={() => select({ screen, component: id })}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData('text/plain', ''); // for Firefox
              setDragging(id);
            }}
            onDragEnd={() => {
              setDragging(undefined);
              setDropTarget(undefined);
            }}
            onDragEnter={() => {
              if (dragging && dragging !== id && type.container) {
                setDropTarget(id);
                setDropWhere('in');
              }
            }}
            onDragOver={(event) => {
              if (dragging && dragging !== id && type.container) {
                event.preventDefault();
              }
            }}
            onDrop={moveChild}
          >
            <Box
              ref={selected.component === id ? selectedRef : undefined}
              pad={{ vertical: 'xsmall', left: 'large', right: 'small' }}
              background={
                (dropTarget && dropTarget === id && dropWhere === 'in')
                ? 'accent-2'
                : (selected.component === id ? 'accent-1' : undefined)
              }
            >
              <Text size="medium" truncate>
                {(reference && treeName(reference)) || treeName(component)}
              </Text>
            </Box>
          </Button>
          {component.children && (
            <Button
              icon={component.collapsed
                ? <FormNext color={collapserColor} />
                : <FormDown color={collapserColor} />}
              onClick={() => toggleCollapse(id)}
            />
          )}
        </Stack>
        {!component.collapsed && component.children && (
          <Box pad={{ left: 'small' }}>
            {component.children.map((childId, index) =>
              renderComponent(screen, childId, index === 0))}
          </Box>
        )}
        {renderDropArea(id, 'after')}
      </Box>
    )
  }

  const renderScreen = (screenId, firstScreen, onlyScreen) => {
    const screen = design.screens[screenId];
    const id = screen.root;
    const component = design.components[id];
    const collapserColor = { light: 'light-4', dark: 'dark-3' };
    return (
      <Box
        key={screen.id}
        flex={false}
        border={firstScreen ? undefined : 'top'}
      >
        {firstScreen && renderScreenDropArea(screenId, 'before')}
        <Stack anchor="left">
          <Button
            fill
            hoverIndicator
            onClick={() => select({ screen: screenId, component: id })}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData('text/plain', ''); // for Firefox
              setDraggingScreen(screenId);
            }}
            onDragEnd={() => {
              setDraggingScreen(undefined);
              setDropScreenTarget(undefined);
            }}
          >
            <Box
              ref={selected.component === screen.root ? selectedRef : undefined}
              direction="row"
              align="center"
              justify="between"
              gap="medium"
              pad={{ vertical: 'small', left: 'large', right: 'small' }}
              background={selected.component === id ? 'accent-1' : undefined}
            >
              <Heading level={3} size="xsmall" margin="none">
                {screen.name || (onlyScreen ? 'Screen' : `Screen ${screen.id}`)}
              </Heading>
            </Box>
          </Button>
          {component.children && (
            <Button
              icon={component.collapsed
                ? <FormNext color={collapserColor} />
                : <FormDown color={collapserColor} />}
              onClick={() => toggleCollapse(id)}
            />
          )}
        </Stack>
        {!component.collapsed && component.children && (
          <Box flex={false}>
            {component.children.map((childId, index) =>
              renderComponent(screen.id, childId, index === 0))}
          </Box>
        )}
        {renderScreenDropArea(screenId, 'after')}
      </Box>
    );
  }

  return (
    <Keyboard target="document" onKeyDown={onKey}>
      <Box
        background={colorMode === 'dark' ? 'dark-1' : 'white'}
        height="100vh"
        border="right"
      >
        <Box flex={false} border="bottom">
          <Box
            flex={false}
            direction="row"
            align="start"
            justify="between"
            border="bottom"
          >
            <ActionButton
              title="choose another design"
              icon={<Folder />}
              onClick={() => setChoosing(true)}
            />
            {choosing && (
              <Designs
                design={design}
                colorMode={colorMode}
                onChange={onChange}
                onClose={() => setChoosing(false)}
              />
            )}
            <Box flex alignSelf="stretch">
              <Button
                fill
                hoverIndicator
                onClick={() => setEditing(true)}
              >
                <Box fill pad="small">
                  <Heading size="18px" margin="none" truncate>
                    {design.name}
                  </Heading>
                </Box>
              </Button>
            </Box>
            <ActionButton
              title="share design"
              icon={<Share />}
              onClick={() => setSharing(true)}
            />
            {sharing && (
              <Sharing
                design={design}
                theme={theme}
                colorMode={colorMode}
                onChange={onChange}
                onClose={() => setSharing(false)}
              />
            )}
          </Box>
          <Box 
            flex={false}
            direction="row"
            justify="between"
            align="center"
          >
            <Box direction="row">
              <ActionButton
                title="undo last change"
                icon={<Undo />}
                disabled={!onUndo}
                onClick={onUndo || undefined}
              />
              <ActionButton
                title="redo last change"
                icon={<Redo />}
                disabled={!onRedo}
                onClick={onRedo || undefined}
              />
            </Box>
            <ActionButton
              title="add a component"
              icon={<Add />}
              onClick={() => setAdding(true)}
            />
          </Box>
          {adding && (
            <AddComponent
              design={design}
              selected={selected}
              onChange={onChange}
              onClose={() => setAdding(false)}
            />
          )}
          {editing && (
            <DesignSettings
              design={design}
              onChange={onChange}
              onClose={() => setEditing(false)}
            />
          )}
        </Box>

        <Box flex overflow="auto">
          <Box flex={false}>
            {design.screenOrder.map((sId, index) =>
              renderScreen(parseInt(sId, 10), index === 0,
                design.screenOrder.length === 1))}
          </Box>
        </Box>
      </Box>
    </Keyboard>
  );
}

export default Tree;
