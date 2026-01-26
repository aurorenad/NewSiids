import {ComponentPreview, Previews} from '@react-buddy/ide-toolbox'
import {ExampleLoaderComponent, PaletteTree} from './palette'
import ReportView from "../Components/ReportView.jsx";

const ComponentPreviews = () => {
    return (
        <Previews palette={<PaletteTree/>}>
            <ComponentPreview path="/ReportView">
                <ReportView/>
            </ComponentPreview>
            <ComponentPreview
                path="/ExampleLoaderComponent">
                <ExampleLoaderComponent/>
            </ComponentPreview>
        </Previews>
    )
}

export default ComponentPreviews