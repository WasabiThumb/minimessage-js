import {Test, runTests, assertEquals, assertNotNull} from "../junit";
import {ArgumentQueue} from "../../src/markup/args";

// noinspection JSMethodCanBeStatic
class ArgumentQueueTest {

    @Test()
    basic() {
        const queue = new ArgumentQueue("0:1:2:3:4:5");

        const first = assertNotNull(queue.peek());
        assertEquals(0, first.asInt().get());

        this.basic0(queue);
        queue.reset();
        this.basic0(queue);
    }

    private basic0(queue: ArgumentQueue) {
        let counter: number = 0;
        let next: number;
        while (queue.hasNext()) {
            next = queue.pop().asInt().get();
            assertEquals(counter++, next);
        }
        assertEquals(6, counter);
    }

    @Test.fail()
    empty() {
        ArgumentQueue.EMPTY.pop();
    }

}

runTests(ArgumentQueueTest);
