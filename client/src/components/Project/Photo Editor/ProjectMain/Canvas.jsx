import React, { useEffect, useRef, useState } from 'react'
import axios from '../../../../api/axios';
import { UPDATE_PROJECT_URL } from '../../../../api/routes';
import { fabric } from 'fabric';
import { Accordion, AccordionDetails, AccordionSummary, Button, ButtonGroup, CircularProgress, Grid, Paper, Slider, Typography } from '@mui/material';
import { ControlsBox, UpdateForm } from '../../../../styles/CreateProjectStyles';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SaveAltOutlinedIcon from '@mui/icons-material/SaveAltOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box } from '@mui/system';
import { saveAsPNG } from '../../../../scripts/saveAsPng';
import { ColorPickerElement } from '../../../Other/ColorPickerElement';
import { FreeDraw } from './FreeDraw';
import { BoxEl, ButtonEl, ErrWarning, TextFieldEl } from '../../../../styles/RegisterStyle';
import { DESCRIPTION_REGEX, NUMBER_REGEX, TITLE_REGEX } from '../../../../regex/regex';
import RectangleOutlinedIcon from '@mui/icons-material/RectangleOutlined';
import CircleOutlinedIcon from '@mui/icons-material/CircleOutlined';
import TextFieldsOutlinedIcon from '@mui/icons-material/TextFieldsOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import LayersClearOutlinedIcon from '@mui/icons-material/LayersClearOutlined';
export const Canvas = ({ projectId, projectInfo }) => {
  const currentUser = JSON.parse(localStorage.getItem('autorized'));
  const [canvas, setCanvas] = useState();
  const [color, setColor] = useState()
  const [canvasBackgroundColor, setCanvasBackgroundColor] = useState();
  const [outlineColor, setOutlineColor] = useState();
  const [showDrawOptions, setShowDrawOption] = useState(false);
  const errRef = useRef();
  const [errMsg, setErrMsg] = useState('');
  const [submitClicked, setSubmitClicked] = useState(false);
  const [title, setTitle] = useState(projectInfo.project.mainInfo.title)
  const [description, setDescription] = useState(projectInfo.project.mainInfo.description)
  const [isLoading, setIsLoading] = useState(false);
  const [width, setWidth] = useState(projectInfo.project.mainInfo.width)
  const [height, setHeight] = useState(projectInfo.project.mainInfo.height);
  const [outlineWidth, setOutlineWidth] = useState(5);

  const handleChange = (event, newValue) => {
    setOutlineWidth(Number(newValue));
  };



  const addFigure = (canvi, figureName) => {
    let figure = null;

    switch (figureName) {
      case 'rect':
        figure = new fabric.Rect({
          height: 280,
          width: 200,
          stroke: outlineColor,
          strokeWidth: outlineWidth,
          fill: color
        });

        canvi.add(figure)

        break;
      case 'circle':
        figure = new fabric.Circle({
          radius: 50,
          fill: color,
          stroke: outlineColor,
          strokeWidth: outlineWidth,

        });

        canvi.add(figure)

        break;
      case 'text':
        figure = new fabric.Textbox('Sample text', {
          width: 200,
          height: 150,
          stroke: outlineColor,
          strokeWidth: outlineWidth,
          fill: color,
        });

        canvi.add(figure)
        break;
      case "image":
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (event) => {
          const file = event.target.files[0];
          const reader = new FileReader();
          reader.onload = () => {
            const img = new Image();
            img.onload = () => {
              const fabricImage = new fabric.Image(img);
              canvi.add(fabricImage);
              canvi.renderAll();
            };
            img.src = reader.result;
          };
          reader.readAsDataURL(file);
        };
        input.click();

        break;
      default:
        break;
    }
    // canvi.add(figure);
    canvi.renderAll();
  }
  const deleteObject = (event) => {
    canvas.remove(canvas.getActiveObject());
  }

  const groupObjects = () => {
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 1) {
      // Нахождение общих координат объектов
      const groupCoords = getGroupCoords(activeObjects);
  
      // Создание новой группы с активными объектами
      const group = new fabric.Group(activeObjects, {
        originX: 'center',
        originY: 'center',
        left: groupCoords.left,
        top: groupCoords.top
      });
  
      // Проверка, не выходит ли группа за пределы окна рисования
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();
      const groupBoundingRect = group.getBoundingRect();
  
      const groupWidth = groupBoundingRect.width;
      const groupHeight = groupBoundingRect.height;
  
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;
  
      // Перемещение группы в центр окна
      const leftOffset = centerX - groupWidth / 2;
      const topOffset = centerY - groupHeight / 2;
  
      group.set({
        left: leftOffset,
        top: topOffset
      });
  
      // Удаление активных объектов из холста
      activeObjects.forEach((obj) => {
        canvas.remove(obj);
      });
  
      // Добавление новой группы на холст
      canvas.add(group);
  
      // Обновление отображения на холсте
      canvas.renderAll();
    }
  };

  const getGroupCoords = (objects) => {
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
  
    objects.forEach((obj) => {
      const objCoords = obj.getBoundingRect();
      left = Math.min(left, objCoords.left);
      top = Math.min(top, objCoords.top);
      right = Math.max(right, objCoords.left + objCoords.width);
      bottom = Math.max(bottom, objCoords.top + objCoords.height);
    });
  
    const width = right - left;
    const height = bottom - top;
  
    return { left: left + width / 2, top: top + height / 2 };
  };
  
  const ungroupObjects = () => {
    if(canvas){
      const activeObject = canvas.getActiveObject();
  
      if (activeObject && activeObject.type === 'group') {
        const objects = activeObject.getObjects();
    
        // Удаление группы и добавление отдельных объектов на холст
        canvas.remove(activeObject);
        objects.forEach((obj) => {
          canvas.add(obj);
        });
    
        // Обновление отображения на холсте
        canvas.renderAll();
      }
    }
  };


  const loadJson = (canvi) => {
    canvi.clear();
    const json = projectInfo.project.projectCanvas.canvas;
    canvi.loadFromJSON(json, () => {
      // Вызывается после загрузки JSON, чтобы объекты были активными
      canvi.setActiveObject(canvi.item(0));
      canvi.renderAll();
    });
  };

  useEffect(() => {
    if (projectInfo) {
      initCanvas(projectInfo);
    }
  }, [projectInfo]);



  useEffect(() => {
    if (canvas) {
      loadJson(canvas)
    }
  }, [canvas])

  const initCanvas = (projectInfo) => {
    const newCanvas = new fabric.Canvas('c', {
      height: projectInfo.project.mainInfo.height,
      width: projectInfo.project.mainInfo.width,
      backgroundColor: projectInfo.project.mainInfo.bgColor,
      isDrawingMode: false
    });
  
    setCanvas(newCanvas);
  };

  const saveProgres = async (canvi) => {
    const projectJSON = JSON.stringify(canvi);
    const parsedProject = JSON.parse(projectJSON)
    parsedProject.background = canvasBackgroundColor;
    console.log(parsedProject);
    const prewiew = canvi.toDataURL('png')
    const updatedInfo = {
      prewiew: prewiew, 
      project: {
        mainInfo: {
          title: title,
          description: description,
          width: width,
          height: height,
          bgColor: canvasBackgroundColor,

        },
        projectCanvas: {
          canvas: parsedProject
        }
      }
    }
    console.log(updatedInfo)
    try {
      const response = await axios.patch(`${UPDATE_PROJECT_URL}/${projectId}/${currentUser.accessToken}`, JSON.stringify(updatedInfo), {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true
      })
      console.log(response)

    } catch (error) {
      console.log(error)
    }


  }

useEffect(() => {
  const timer = setInterval(() => {
    saveProgres(canvas)
    console.log('autosave')
  }, 60000);

  return () => {
    clearTimeout(timer);
  };
}, [canvas])
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitClicked(true)
    setErrMsg('');
    try {
      setIsLoading(true)
      await saveProgres(canvas);
      setIsLoading(false);
      document.location.reload()
    } catch (error) {
      setIsLoading(false)
      console.log(error)
    }

  }

  return (
    <>
      <Grid container spacing={2} direction="row" justifyContent={'center'}>
        <Grid item>
          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="panel1a-content"
              id="panel1a-header"

            >
              <Typography>Controls</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <ControlsBox>
                <Typography>Figures</Typography>
                <ButtonGroup variant="outlined" aria-label="outlined button group">
                  <Button onClick={() => addFigure(canvas, 'rect')}><RectangleOutlinedIcon /></Button>
                  <Button onClick={() => addFigure(canvas, 'circle')}><CircleOutlinedIcon /></Button>
                  <Button onClick={() => addFigure(canvas, 'text')}><TextFieldsOutlinedIcon /></Button>
                  <Button onClick={() => addFigure(canvas, 'image')}><ImageOutlinedIcon /></Button>
                  <Button onClick={() => deleteObject()}><DeleteOutlinedIcon /></Button>
                  <Button onClick={groupObjects}>Group</Button>
                  <Button onClick={ungroupObjects}>Ungroup</Button>
                </ButtonGroup>
                
              </ControlsBox>

              <Box>
                <ColorPickerElement colorStateValue={color} setColorState={setColor} label="Color" defaultValue={'rgb(0, 0, 0)'} />
                <ColorPickerElement colorStateValue={outlineColor} setColorState={setOutlineColor} label="Outline color" defaultValue={'rgb(0, 0, 0)'} />
                <ControlsBox>
                  <Typography>Outline width</Typography>

                  <Slider aria-label="Temperature" valueLabelDisplay="auto" value={outlineWidth} onChange={handleChange} />
                </ControlsBox>
              </Box>
              <ControlsBox>
                <Typography>Save and Donwload</Typography>
                <ButtonGroup variant="outlined" aria-label="outlined button group">
                  <Button id="clear-canvas"><LayersClearOutlinedIcon /></Button>
                  <Button onClick={() => saveProgres(canvas)}><SaveOutlinedIcon /></Button>
                  <Button onClick={() => saveAsPNG(canvas, projectInfo)}><SaveAltOutlinedIcon /></Button>
                </ButtonGroup>
                </ControlsBox>



            </AccordionDetails>
          </Accordion>
        </Grid>
        <Grid item>
          <FreeDraw canvas={canvas} />
        </Grid>
        <Grid item >
          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="panel1a-content"
              id="panel1a-header"
            >
              <Typography>Project Settings</Typography>
            </AccordionSummary>
            <AccordionDetails>

              <UpdateForm
                component="form"
                noValidate
                autoComplete="off"
                onSubmit={handleSubmit}
              >
                <ErrWarning ref={errRef} className={errMsg ? "warning" : "offscreen"} aria-live="assertive">{errMsg}</ErrWarning>
                <TextFieldEl
                  label="Title"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  error={TITLE_REGEX.test(title) === false && submitClicked === true}
                  helperText={TITLE_REGEX.test(title) === false && submitClicked === true ? 'Title required (minimum 3 characters)' : ' '}
                />
                <TextFieldEl
                  label="Description"
                  required
                  multiline
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  error={DESCRIPTION_REGEX.test(description) === false && submitClicked === true}
                  helperText={DESCRIPTION_REGEX.test(description) === false && submitClicked === true ? 'Description required (minimum 10 characters)' : ' '}
                />
                <div style={{ display: "flex" }}>
                  <TextFieldEl
                    label="Width"
                    required
                    value={width}
                    onChange={e => setWidth(e.target.value)}
                    error={NUMBER_REGEX.test(width) === false && submitClicked === true}
                    helperText={NUMBER_REGEX.test(width) === false && submitClicked === true ? 'Width must be a number' : ' '}
                  />
                  <TextFieldEl
                    label="Height"
                    required
                    value={height}
                    onChange={e => setHeight(e.target.value)}
                    error={NUMBER_REGEX.test(height) === false && submitClicked === true}
                    helperText={NUMBER_REGEX.test(height) === false && submitClicked === true ? 'Height must be a number' : ' '}
                  />
                </div>
                <ColorPickerElement colorStateValue={canvasBackgroundColor} setColorState={setCanvasBackgroundColor} label="BG color 1" defaultValue={projectInfo.project.mainInfo.bgColor} />

                <ButtonEl type="submit" variant="contained">
                  {
                    isLoading ? <CircularProgress size={24} /> :
                      <p>Save</p>
                  }

                </ButtonEl>
              </UpdateForm>

            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>

      <BoxEl>
        <canvas id="c" ></canvas>
      </BoxEl>
    </>
  )
}