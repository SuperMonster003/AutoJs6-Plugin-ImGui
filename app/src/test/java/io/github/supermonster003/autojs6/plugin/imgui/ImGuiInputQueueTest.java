package io.github.supermonster003.autojs6.plugin.imgui;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;

import org.junit.Test;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public final class ImGuiInputQueueTest {

    @Test
    public void drainsMixedEventsInFifoOrder() {
        ImGuiInputQueue queue = new ImGuiInputQueue(8);
        RecordingSink sink = new RecordingSink();

        queue.offerTouch(2, 12.5F, 24.5F, 1);
        queue.offerCharacters("AutoJs6");
        queue.offerKey(513, true);
        queue.offerWheel(-1.0F, 2.0F);

        assertEquals(4, queue.pendingCount());
        assertEquals(4, queue.drainTo(sink));
        assertEquals(
            List.of(
                "touch:2:12.5:24.5:1",
                "characters:AutoJs6",
                "key:513:true",
                "wheel:-1.0:2.0"
            ),
            sink.events
        );
        assertEquals(0, queue.pendingCount());
    }

    @Test
    public void boundedQueueDropsOldestEvents() {
        ImGuiInputQueue queue = new ImGuiInputQueue(3);
        RecordingSink sink = new RecordingSink();

        queue.offerKey(1, true);
        queue.offerKey(2, true);
        queue.offerKey(3, true);
        queue.offerKey(4, true);

        assertEquals(3, queue.pendingCount());
        assertEquals(1, queue.droppedCount());
        assertEquals(3, queue.drainTo(sink));
        assertEquals(
            List.of("key:2:true", "key:3:true", "key:4:true"),
            sink.events
        );
    }

    @Test
    public void resetAtomicallyDiscardsPriorLifecycle() {
        ImGuiInputQueue queue = new ImGuiInputQueue(4);
        RecordingSink sink = new RecordingSink();
        queue.offerCharacters("stale");
        queue.offerCharacters("also stale");

        queue.reset();
        queue.offerCharacters("current");

        assertEquals(1, queue.drainTo(sink));
        assertEquals(List.of("characters:current"), sink.events);
        assertEquals(0, queue.droppedCount());
    }

    @Test
    public void concurrentProducersDoNotLoseEventsBelowCapacity() throws Exception {
        int producerCount = 4;
        int eventsPerProducer = 1_000;
        ImGuiInputQueue queue = new ImGuiInputQueue(producerCount * eventsPerProducer);
        RecordingSink sink = new RecordingSink();
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch complete = new CountDownLatch(producerCount);

        for (int producer = 0; producer < producerCount; producer++) {
            final int producerId = producer;
            Thread thread = new Thread(() -> {
                try {
                    start.await();
                    for (int event = 0; event < eventsPerProducer; event++) {
                        queue.offerKey(producerId * eventsPerProducer + event, true);
                    }
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                } finally {
                    complete.countDown();
                }
            }, "imgui-input-producer-" + producer);
            thread.start();
        }

        start.countDown();
        assertEquals(true, complete.await(10, TimeUnit.SECONDS));
        assertEquals(producerCount * eventsPerProducer, queue.pendingCount());
        assertEquals(0, queue.droppedCount());
        assertEquals(producerCount * eventsPerProducer, queue.drainTo(sink));
        assertEquals(producerCount * eventsPerProducer, sink.events.size());
    }

    @Test
    public void rejectsInvalidConstructionAndSink() {
        assertThrows(IllegalArgumentException.class, () -> new ImGuiInputQueue(0));
        ImGuiInputQueue queue = new ImGuiInputQueue(1);
        assertEquals(1, queue.capacity());
        assertThrows(IllegalArgumentException.class, () -> queue.drainTo(null));
    }

    private static final class RecordingSink implements ImGuiInputQueue.Sink {
        final List<String> events = Collections.synchronizedList(new ArrayList<>());

        @Override
        public void touch(int action, float x, float y, int mouseButton) {
            events.add("touch:" + action + ":" + x + ":" + y + ":" + mouseButton);
        }

        @Override
        public void characters(String text) {
            events.add("characters:" + text);
        }

        @Override
        public void key(int key, boolean down) {
            events.add("key:" + key + ":" + down);
        }

        @Override
        public void wheel(float wheelX, float wheelY) {
            events.add("wheel:" + wheelX + ":" + wheelY);
        }
    }
}
